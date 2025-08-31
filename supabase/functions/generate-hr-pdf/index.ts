import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Arayüz, veritabanından gelen tüm alanları içerecek şekilde güncellendi.
interface HRRequest {
  id: string;
  signature: string | null; // Personelin imzası
  staff: {
    employee_code: string;
    profiles: {
      full_name: string | null;
      email: string;
    };
  };
  type: string;
  title: string;
  description: string | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  approvals: Array<{ // Tablo adı `hr_request_approvals` ama ilişkide `approvals` olarak geliyor
    approval_type: string;
    status: string;
    notes: string | null;
    signature: string | null; // Yönetici imzası
    approver: {
      full_name: string | null;
      email: string;
    } | null;
    created_at: string;
  }>;
}

const generateHRPDF = (request: HRRequest): string => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const getTypeText = (type: string) => ({ leave: 'İzin Talebi', advance: 'Avans Talebi', other: 'Diğer Talep' }[type] || type);
  const getStatusText = (status: string) => ({
    hr_approved: 'ONAYLANDI',
    hr_rejected: 'REDDEDİLDİ',
    sales_approved: 'SATIŞ MGR. ONAYLANDI',
    sales_rejected: 'SATIŞ MGR. REDDEDİLDİ',
    pending: 'BEKLEMEDE'
  }[status] || status.toUpperCase());

  const salesApproval = request.approvals?.find(a => a.approval_type === 'sales_manager');
  const hrApproval = request.approvals?.find(a => a.approval_type === 'hr_manager');

  // İmza alanlarını oluşturan yardımcı fonksiyon
  const createSignatureBox = (title: string, name: string, date: string | null, signature: string | null) => {
    return `
      <div class="signature-box">
        <div class="signature-title">${title}</div>
        <div class="signature-area">
          ${signature 
            ? `<img src="${signature}" alt="imza" style="width: 150px; height: 50px; object-fit: contain;"/>` 
            : '<div class="signature-placeholder">(İmza Bekleniyor)</div>'
          }
        </div>
        <div class="signature-name">${name}</div>
        ${date ? `<div class="signature-date">${formatDate(date)}</div>` : ''}
      </div>
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"><title>İK Talep Formu</title>
  <style>
    @page { size: A4; margin: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background: white; color: #1F2937; font-size: 11pt; }
    .page { width: 210mm; height: 297mm; padding: 20mm; box-sizing: border-box; display: flex; flex-direction: column; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { width: 120px; height: auto; }
    .header-text { text-align: right; }
    .document-title { font-size: 22px; font-weight: bold; color: #1E40AF; margin: 0; }
    .request-number { font-size: 12px; color: #64748B; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 16px; font-weight: bold; color: #1E40AF; border-bottom: 1px solid #DBEAFE; padding-bottom: 8px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .info-item { padding-bottom: 8px; }
    .info-label { font-weight: 600; color: #374151; font-size: 12px; }
    .info-value { color: #1F2937; }
    .description-content { white-space: pre-wrap; background: #F8FAFC; padding: 12px; border-radius: 6px; border: 1px solid #E5E7EB; }
    .signature-container { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: auto; padding-top: 30px; text-align: center; }
    .signature-box { border-top: 1px solid #374151; padding-top: 8px; }
    .signature-area { height: 60px; display: flex; justify-content: center; align-items: center; }
    .signature-placeholder { color: #9CA3AF; font-size: 12px; }
    .signature-title { font-size: 12px; font-weight: 600; color: #374151; }
    .signature-name { font-size: 14px; font-weight: 500; }
    .signature-date { font-size: 12px; color: #64748B; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 10px; color: #64748B; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img src="https://sagaguvenlik.com/wp-content/uploads/2023/08/saga-guvenlik-logo-1024x350.png" alt="Şirket Logosu" class="logo"/>
      <div class="header-text">
        <div class="document-title">${getTypeText(request.type)}</div>
        <div class="request-number">Talep No: ${request.id.substring(0, 8).toUpperCase()} | Tarih: ${formatDate(request.created_at)}</div>
      </div>
    </div>
    <div style="flex-grow: 1;">
        <div class="section"><div class="section-title">Personel Bilgileri</div><div class="info-grid"><div class="info-item"><div class="info-label">Ad Soyad</div><div class="info-value">${request.staff.profiles.full_name || ''}</div></div><div class="info-item"><div class="info-label">E-posta</div><div class="info-value">${request.staff.profiles.email}</div></div><div class="info-item"><div class="info-label">Personel Kodu</div><div class="info-value">#${request.staff.employee_code}</div></div></div></div>
        <div class="section"><div class="section-title">Talep Detayları</div><div class="info-grid"><div class="info-item"><div class="info-label">Başlık</div><div class="info-value">${request.title}</div></div><div class="info-item"><div class="info-label">Nihai Durum</div><div class="info-value">${getStatusText(request.status)}</div></div>${request.amount ? `<div class="info-item"><div class="info-label">Tutar</div><div class="info-value">₺${request.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div></div>` : ''}${request.start_date ? `<div class="info-item"><div class="info-label">Tarih Aralığı</div><div class="info-value">${formatDate(request.start_date)} - ${formatDate(request.end_date)}</div></div>` : ''}</div></div>
        ${request.description ? `<div class="section"><div class="section-title">Açıklama</div><div class="description-content">${request.description}</div></div>` : ''}
    </div>
    <div class="signature-container">
      ${createSignatureBox('Talep Eden', request.staff.profiles.full_name || '', request.created_at, request.signature)}
      ${createSignatureBox('Satış Müdürü', salesApproval?.approver?.full_name || 'Onay Bekleniyor', salesApproval?.created_at || null, salesApproval?.signature || null)}
      ${createSignatureBox('İnsan Kaynakları', hrApproval?.approver?.full_name || 'Onay Bekleniyor', hrApproval?.created_at || null, hrApproval?.signature || null)}
    </div>
    <div class="footer"><p>Bu belge, dijital olarak sistem tarafından otomatik olarak oluşturulmuştur.</p></div>
  </div>
</body>
</html>`;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const { requestId } = await req.json();
    if (!requestId) throw new Error('Request ID is required');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: request, error } = await supabase.from('hr_requests').select(`*, staff!inner(employee_code, profiles!inner(full_name, email)), approvals:hr_request_approvals(approval_type, status, notes, created_at, signature, approver:profiles!hr_request_approvals_approver_id_fkey(full_name, email))`).eq('id', requestId).single();
    if (error || !request) throw new Error(error?.message || 'Request not found');

    const htmlContent = generateHRPDF(request as any);
    return new Response(htmlContent, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

