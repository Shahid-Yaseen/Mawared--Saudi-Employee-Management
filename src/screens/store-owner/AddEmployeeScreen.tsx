import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    useWindowDimensions,
} from 'react-native';
import { TextInput, Button, HelperText, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabase';
import { Spacing, Typography, BorderRadius } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';


export default function AddEmployeeScreen({ navigation }: any) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768;
    const [loading, setLoading] = useState(false);

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [department, setDepartment] = useState('');
    const [position, setPosition] = useState('');
    const [salary, setSalary] = useState('');
    const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
    const [role, setRole] = useState<'employee' | 'hr'>('employee');

    // Validation errors
    const [errors, setErrors] = useState<any>({});

    const validate = () => {
        const newErrors: any = {};

        if (!email || !email.includes('@')) {
            newErrors.email = 'Valid email is required';
        }
        if (!password || password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }
        if (!fullName) {
            newErrors.fullName = 'Full name is required';
        }
        if (!phone) {
            newErrors.phone = 'Phone number is required';
        }
        if (!employeeNumber) {
            newErrors.employeeNumber = 'Employee number is required';
        }
        if (!department) {
            newErrors.department = 'Department is required';
        }
        if (!position) {
            newErrors.position = 'Position is required';
        }
        if (!salary || isNaN(parseFloat(salary))) {
            newErrors.salary = 'Valid salary is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            Alert.alert('Validation Error', 'Please fill all required fields correctly');
            return;
        }

        setLoading(true);

        try {
            // Step 1: Get current user (store owner)
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Not authenticated');
            }

            // Step 2: Get store ID
            let { data: storeData, error: storeError } = await supabase
                .from('stores')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            // Auto-create a default store if none exists
            if (!storeData) {
                console.log('No store found, attempting to create one...');
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                const { data: newStore, error: createError } = await supabase
                    .from('stores')
                    .insert({
                        owner_id: user.id,
                        store_name: `${profile?.full_name || 'My'} Store`,
                        store_number: `STR${Math.floor(Math.random() * 10000)}`,
                        status: 'active'
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Store auto-creation failed:', createError.message);
                    throw new Error('You need at least one Store to add employees. Please go to Settings to create your store first.');
                }
                storeData = newStore;
            }

            if (!storeData?.id) {
                throw new Error('Store ID is missing. Please contact support.');
            }

            // Step 3: Create user in Supabase Auth
            let userId;
            try {
                const { data: authData, error: authError } = await supabase.functions.invoke('create-employee', {
                    body: {
                        email,
                        password,
                        full_name: fullName,
                        phone,
                        role,
                    },
                });

                if (!authError && authData?.user_id) {
                    userId = authData.user_id;
                } else {
                    console.log('Edge function failed, trying direct signUp');
                    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: fullName,
                                phone,
                                role,
                                is_test_user: true
                            }
                        }
                    });

                    if (signUpError) {
                        if (signUpError.message.includes('already registered')) {
                            console.log('User already registered in Auth, checking profiles table...');
                            const { data: existingProfile, error: profileSearchError } = await supabase
                                .from('profiles')
                                .select('id')
                                .eq('email', email)
                                .single();

                            if (!profileSearchError && existingProfile) {
                                userId = existingProfile.id;
                                console.log('Found existing user ID:', userId);
                            } else {
                                throw new Error('User is registered but profile not found. Please contact support.');
                            }
                        } else {
                            throw signUpError;
                        }
                    } else {
                        userId = signUpData.user?.id;
                    }

                    // Ensure profile is up to date
                    if (userId) {
                        const { error: profileError } = await supabase
                            .from('profiles')
                            .upsert({
                                id: userId,
                                email,
                                full_name: fullName,
                                phone,
                                role,
                            });
                        if (profileError) {
                            console.warn('Profile upsert failed:', profileError.message);
                        }
                    }
                }
            } catch (err: any) {
                console.error('Auth creation error:', err);

                // Final fallback if everything failed but we might still have a user
                if (!userId && err.message?.includes('already registered')) {
                    const { data: finalCheck } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', email)
                        .single();
                    if (finalCheck) userId = finalCheck.id;
                }

                if (!userId) throw err;
            }

            if (!userId) {
                throw new Error('Failed to create or identify user account');
            }

            // Step 4: Create/Update employee record
            console.log('Creating employee record for:', userId);
            const { error: employeeError } = await supabase
                .from('employees')
                .upsert({
                    user_id: userId,
                    store_id: storeData?.id,
                    employee_number: employeeNumber,
                    department,
                    position,
                    hire_date: hireDate,
                    salary: parseFloat(salary),
                    status: 'active',
                }, {
                    onConflict: 'employee_number'
                });

            if (employeeError) {
                throw new Error('User account ready but employee details could not be saved: ' + employeeError.message);
            }

            Alert.alert(
                'Success',
                `${role === 'hr' ? 'HR' : 'Employee'} added successfully!`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error: any) {
            console.error('Error adding employee:', error);
            Alert.alert('Error', error.message || 'Failed to add employee');
        } finally {
            setLoading(false);
        }
    };

    return (
            <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.content]}>
                    {isLargeScreen && <Text style={[styles.title, { color: theme.colors.text }]}>Add New {role === 'hr' ? 'HR' : 'Employee'}</Text>}
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        Fill in the details to create a new {role === 'hr' ? 'HR staff' : 'employee'} account
                    </Text>

                    {/* Role Selection */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Role</Text>
                        <View style={styles.roleContainer}>
                            <Chip
                                selected={role === 'employee'}
                                onPress={() => setRole('employee')}
                                style={styles.roleChip}
                                selectedColor={theme.colors.primary}
                                showSelectedOverlay
                            >
                                Employee
                            </Chip>
                            <Chip
                                selected={role === 'hr'}
                                onPress={() => setRole('hr')}
                                style={styles.roleChip}
                                selectedColor={theme.colors.primary}
                                showSelectedOverlay
                            >
                                HR Staff
                            </Chip>
                        </View>
                    </View>

                    {/* Account Information */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account Information</Text>

                        <TextInput
                            label="Email *"
                            value={email}
                            onChangeText={setEmail}
                            mode="outlined"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            error={!!errors.email}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                        {errors.email && <HelperText type="error">{errors.email}</HelperText>}

                        <TextInput
                            label="Password *"
                            value={password}
                            onChangeText={setPassword}
                            mode="outlined"
                            secureTextEntry
                            error={!!errors.password}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                        {errors.password && <HelperText type="error">{errors.password}</HelperText>}
                    </View>

                    {/* Personal Information */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>

                        <TextInput
                            label="Full Name *"
                            value={fullName}
                            onChangeText={setFullName}
                            mode="outlined"
                            error={!!errors.fullName}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                        {errors.fullName && <HelperText type="error">{errors.fullName}</HelperText>}

                        <TextInput
                            label="Phone Number *"
                            value={phone}
                            onChangeText={setPhone}
                            mode="outlined"
                            keyboardType="phone-pad"
                            error={!!errors.phone}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            placeholder="+966XXXXXXXXX"
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                        {errors.phone && <HelperText type="error">{errors.phone}</HelperText>}
                    </View>

                    {/* Employment Information */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Employment Information</Text>

                        <TextInput
                            label="Employee Number *"
                            value={employeeNumber}
                            onChangeText={setEmployeeNumber}
                            mode="outlined"
                            error={!!errors.employeeNumber}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            placeholder="EMP001"
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                        {errors.employeeNumber && <HelperText type="error">{errors.employeeNumber}</HelperText>}

                        <TextInput
                            label="Department *"
                            value={department}
                            onChangeText={setDepartment}
                            mode="outlined"
                            error={!!errors.department}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            placeholder="Sales, IT, HR, etc."
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                        {errors.department && <HelperText type="error">{errors.department}</HelperText>}

                        <TextInput
                            label="Position *"
                            value={position}
                            onChangeText={setPosition}
                            mode="outlined"
                            error={!!errors.position}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            placeholder="Sales Associate, Manager, etc."
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                        {errors.position && <HelperText type="error">{errors.position}</HelperText>}

                        <TextInput
                            label="Monthly Salary (SAR) *"
                            value={salary}
                            onChangeText={setSalary}
                            mode="outlined"
                            keyboardType="numeric"
                            error={!!errors.salary}
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            placeholder="5000.00"
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                        {errors.salary && <HelperText type="error">{errors.salary}</HelperText>}

                        <TextInput
                            label="Hire Date *"
                            value={hireDate}
                            onChangeText={setHireDate}
                            mode="outlined"
                            style={[styles.input, { backgroundColor: theme.colors.surface }]}
                            placeholder="YYYY-MM-DD"
                            textColor={theme.colors.text}
                            outlineColor={theme.colors.divider}
                            activeOutlineColor={theme.colors.primary}
                        />
                    </View>

                    {/* Submit Button */}
                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={loading}
                        disabled={loading}
                        style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                        contentStyle={styles.submitButtonContent}
                        textColor="#FFFFFF"
                    >
                        Add {role === 'hr' ? 'HR Staff' : 'Employee'}
                    </Button>

                    <Button
                        mode="outlined"
                        onPress={() => navigation.goBack()}
                        disabled={loading}
                        style={[styles.cancelButton, { borderColor: theme.colors.divider }]}
                        textColor={theme.colors.textSecondary}
                    >
                        Cancel
                    </Button>
                </View>
            </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl * 2,
    },
    title: {
        ...Typography.h4,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        ...Typography.body,
        marginBottom: Spacing.lg,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        ...Typography.h5,
        marginBottom: Spacing.md,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    roleChip: {
        marginRight: Spacing.sm,
    },
    input: {
        marginBottom: Spacing.sm,
    },
    submitButton: {
        marginTop: Spacing.md,
    },
    submitButtonContent: {
        paddingVertical: Spacing.sm,
    },
    cancelButton: {
        marginTop: Spacing.sm,
    },
});
