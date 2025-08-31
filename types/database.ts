export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role_id: string | null;
          team_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role_id?: string | null;
          team_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role_id?: string | null;
          team_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          category: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          category: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          category?: string;
          created_at?: string | null;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string | null;
          permission_id: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          role_id?: string | null;
          permission_id?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          role_id?: string | null;
          permission_id?: string | null;
          created_at?: string | null;
        };
      };
      cities: {
        Row: {
          id: string;
          name: string;
          code: string;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          city_id: string | null;
          manager_id: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          city_id?: string | null;
          manager_id?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          city_id?: string | null;
          manager_id?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      staff: {
        Row: {
          id: string;
          profile_id: string | null;
          employee_code: string;
          phone: string | null;
          hire_date: string | null;
          team_id: string | null;
          is_active: boolean | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          employee_code: string;
          phone?: string | null;
          hire_date?: string | null;
          team_id?: string | null;
          is_active?: boolean | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          employee_code?: string;
          phone?: string | null;
          hire_date?: string | null;
          team_id?: string | null;
          is_active?: boolean | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          type: 'individual' | 'corporate';
          tax_number: string | null;
          assigned_staff_id: string | null;
          city_id: string | null;
          notes: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          type?: 'individual' | 'corporate';
          tax_number?: string | null;
          assigned_staff_id?: string | null;
          city_id?: string | null;
          notes?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          type?: 'individual' | 'corporate';
          tax_number?: string | null;
          assigned_staff_id?: string | null;
          city_id?: string | null;
          notes?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: 'main_package' | 'additional_product';
          wired_price: number;
          wireless_price: number;
          is_active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type?: 'main_package' | 'additional_product';
          wired_price?: number;
          wireless_price?: number;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          type?: 'main_package' | 'additional_product';
          wired_price?: number;
          wireless_price?: number;
          is_active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
    hr_requests: {
      Row: {
        id: string;
        staff_id: string | null;
        type: 'leave' | 'advance' | 'other';
        title: string;
        description: string | null;
        amount: number | null;
        start_date: string | null;
        end_date: string | null;
        status: 'pending' | 'sales_approved' | 'sales_rejected' | 'hr_approved' | 'hr_rejected';
        created_at: string | null;
        updated_at: string | null;
      };
      Insert: {
        id?: string;
        staff_id?: string | null;
        type: 'leave' | 'advance' | 'other';
        title: string;
        description?: string | null;
        amount?: number | null;
        start_date?: string | null;
        end_date?: string | null;
        status?: 'pending' | 'sales_approved' | 'sales_rejected' | 'hr_approved' | 'hr_rejected';
        created_at?: string | null;
        updated_at?: string | null;
      };
      Update: {
        id?: string;
        staff_id?: string | null;
        type?: 'leave' | 'advance' | 'other';
        title?: string;
        description?: string | null;
        amount?: number | null;
        start_date?: string | null;
        end_date?: string | null;
        status?: 'pending' | 'sales_approved' | 'sales_rejected' | 'hr_approved' | 'hr_rejected';
        created_at?: string | null;
        updated_at?: string | null;
      };
    };
    packages: {
      Row: {
        id: string;
        name: string;
        description: string | null;
        is_active: boolean;
        created_at: string | null;
        updated_at: string | null;
      };
      Insert: {
        id?: string;
        name: string;
        description?: string | null;
        is_active?: boolean;
        created_at?: string | null;
        updated_at?: string | null;
      };
      Update: {
        id?: string;
        name?: string;
        description?: string | null;
        is_active?: boolean;
        created_at?: string | null;
        updated_at?: string | null;
      };
    };
    package_products: {
      Row: {
        id: string;
        package_id: string;
        name: string;
        description: string | null;
        price: number;
        is_required: boolean;
        is_active: boolean;
        created_at: string | null;
      };
      Insert: {
        id?: string;
        package_id: string;
        name: string;
        description?: string | null;
        price?: number;
        is_required?: boolean;
        is_active?: boolean;
        created_at?: string | null;
      };
      Update: {
        id?: string;
        package_id?: string;
        name?: string;
        description?: string | null;
        price?: number;
        is_required?: boolean;
        is_active?: boolean;
        created_at?: string | null;
      };
    };
    hr_request_approvals: {
      Row: {
        id: string;
        request_id: string | null;
        approver_id: string | null;
        approval_type: 'sales_manager' | 'hr_manager';
        status: 'approved' | 'rejected';
        notes: string | null;
        created_at: string | null;
      };
      Insert: {
        id?: string;
        request_id?: string | null;
        approver_id?: string | null;
        approval_type: 'sales_manager' | 'hr_manager';
        status: 'approved' | 'rejected';
        notes?: string | null;
        created_at?: string | null;
      };
      Update: {
        id?: string;
        request_id?: string | null;
        approver_id?: string | null;
        approval_type?: 'sales_manager' | 'hr_manager';
        status?: 'approved' | 'rejected';
        notes?: string | null;
        created_at?: string | null;
      };
    };
  };
}