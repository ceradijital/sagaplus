/*
  # İnsan Kaynakları Sistemi

  1. Yeni Tablolar
    - `hr_requests` - Personel talepleri (izin, avans, diğer)
    - `hr_request_approvals` - Onay süreci kayıtları

  2. Talep Türleri
    - leave: İzin talebi
    - advance: Avans talebi  
    - other: Diğer talepler

  3. Onay Süreci
    - pending: Beklemede
    - sales_approved/rejected: Satış müdürü onayı
    - hr_approved/rejected: İK onayı

  4. Güvenlik
    - RLS aktif
    - Personel kendi taleplerini görebilir
    - Satış müdürleri ekip taleplerini yönetebilir
    - İK yetkilileri tüm talepleri yönetebilir
*/

-- Create enum for request types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_request_type') THEN
        CREATE TYPE hr_request_type AS ENUM ('leave', 'advance', 'other');
    END IF;
END $$;

-- Create enum for request status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_request_status') THEN
        CREATE TYPE hr_request_status AS ENUM ('pending', 'sales_approved', 'sales_rejected', 'hr_approved', 'hr_rejected');
    END IF;
END $$;

-- Create enum for approval types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_approval_type') THEN
        CREATE TYPE hr_approval_type AS ENUM ('sales_manager', 'hr_manager');
    END IF;
END $$;

-- Create enum for approval status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_approval_status') THEN
        CREATE TYPE hr_approval_status AS ENUM ('approved', 'rejected');
    END IF;
END $$;

-- Create HR requests table
CREATE TABLE IF NOT EXISTS hr_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
    type hr_request_type NOT NULL,
    title text NOT NULL,
    description text,
    amount decimal(10,2),
    start_date date,
    end_date date,
    status hr_request_status DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create HR request approvals table
CREATE TABLE IF NOT EXISTS hr_request_approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES hr_requests(id) ON DELETE CASCADE,
    approver_id uuid REFERENCES profiles(id),
    approval_type hr_approval_type NOT NULL,
    status hr_approval_status NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Add permissions for HR system
INSERT INTO permissions (name, code, description, category) VALUES
('HR Talebi Görüntüleme', 'hr.requests.view', 'Kendi HR taleplerini görüntüleyebilir', 'İnsan Kaynakları'),
('HR Talebi Oluşturma', 'hr.requests.create', 'Yeni HR talebi oluşturabilir', 'İnsan Kaynakları'),
('HR Satış Onayı', 'hr.requests.approve_sales', 'Satış müdürü olarak HR taleplerini onaylayabilir', 'İnsan Kaynakları'),
('HR Yönetimi', 'hr.requests.manage', 'Tüm HR taleplerini yönetebilir', 'İnsan Kaynakları')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE hr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_request_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hr_requests

-- Staff can view their own requests
CREATE POLICY "Staff can view own HR requests"
    ON hr_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s 
            WHERE s.id = hr_requests.staff_id 
            AND s.profile_id = auth.uid()
        )
    );

-- Staff can create their own requests  
CREATE POLICY "Staff can create own HR requests"
    ON hr_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM staff s 
            WHERE s.id = hr_requests.staff_id 
            AND s.profile_id = auth.uid()
        )
    );

-- Sales managers can view team requests
CREATE POLICY "Sales managers can view team HR requests"
    ON hr_requests
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM staff s
            JOIN teams t ON s.team_id = t.id
            WHERE s.id = hr_requests.staff_id
            AND t.manager_id = auth.uid()
        )
    );

-- HR managers can view all requests
CREATE POLICY "HR managers can view all HR requests"
    ON hr_requests
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions perm ON rp.permission_id = perm.id
            WHERE p.id = auth.uid()
            AND perm.code = 'hr.requests.manage'
        )
    );

-- Service role can do everything
CREATE POLICY "Service role can manage all HR requests"
    ON hr_requests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- RLS Policies for hr_request_approvals

-- Users can view approvals for their own requests
CREATE POLICY "Users can view own request approvals"
    ON hr_request_approvals
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM hr_requests hr
            JOIN staff s ON hr.staff_id = s.id
            WHERE hr.id = hr_request_approvals.request_id
            AND s.profile_id = auth.uid()
        )
    );

-- Sales managers can create approvals for team requests
CREATE POLICY "Sales managers can approve team requests"
    ON hr_request_approvals
    FOR INSERT
    TO authenticated
    WITH CHECK (
        approval_type = 'sales_manager'
        AND EXISTS (
            SELECT 1 FROM hr_requests hr
            JOIN staff s ON hr.staff_id = s.id
            JOIN teams t ON s.team_id = t.id
            WHERE hr.id = hr_request_approvals.request_id
            AND t.manager_id = auth.uid()
        )
    );

-- HR managers can create all approvals
CREATE POLICY "HR managers can approve all requests"
    ON hr_request_approvals
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions perm ON rp.permission_id = perm.id
            WHERE p.id = auth.uid()
            AND perm.code = 'hr.requests.manage'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions perm ON rp.permission_id = perm.id
            WHERE p.id = auth.uid()
            AND perm.code = 'hr.requests.manage'
        )
    );

-- Service role can do everything
CREATE POLICY "Service role can manage all HR approvals"
    ON hr_request_approvals
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger for hr_requests
CREATE TRIGGER update_hr_requests_updated_at
    BEFORE UPDATE ON hr_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hr_requests_staff_id ON hr_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_hr_requests_status ON hr_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_request_approvals_request_id ON hr_request_approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_hr_request_approvals_approver_id ON hr_request_approvals(approver_id);