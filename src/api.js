// Tüm sayfalar backend'le bu yardımcı üzerinden konuşur.
// Token ekler, 401'de oturumu kapatır, hata mesajını backend'in "detail" alanından alır.
export function apiOlustur(token, onYetkisiz) {
  return async function api(yol, { method = 'GET', govde } = {}) {
    try {
      const r = await fetch(yol, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: govde ? JSON.stringify(govde) : undefined,
      });
      if (r.status === 401) {
        onYetkisiz?.();
        throw new Error('Oturum süresi doldu, tekrar giriş yapın.');
      }
      const veri = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(veri.detail || 'Bir hata oluştu.');
      return veri;
    } catch (e) {
      if (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError') || e.name === 'TypeError') {
        throw new Error('Sunucuya bağlanılamadı. Backend servisi yeniden başlatılıyor olabilir.');
      }
      throw e;
    }
  };
}
