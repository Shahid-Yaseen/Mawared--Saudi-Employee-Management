import React from 'react';
import SidebarLayout from './SidebarLayout';

export default function withSidebarLayout(
  ScreenComponent: React.ComponentType<any>,
  role: 'employee' | 'store_owner' | 'hr_team' | 'super_admin',
  activeRoute: string
) {
  return function WrappedScreen(props: any) {
    return (
      <SidebarLayout navigation={props.navigation} activeRoute={activeRoute} role={role}>
        <ScreenComponent {...props} />
      </SidebarLayout>
    );
  };
}
