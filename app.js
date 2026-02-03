// Supabase 설정
const SUPABASE_URL = 'https://smfehxrxkbajkwbwvrma.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZmVoeHJ4a2Jhamt3Ynd2cm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1NzUwMTUsImV4cCI6MjA1NDE1MTAxNX0.dxWYnmU3h2OPCiOH0Kl_zQaP6t6fhWdNfJLVGhiSKk0';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase initialized:', sb);

// 전역 변수
let currentUser = null;
let canvas, ctx;
let currentTemplate = 'classic';
let uploadedImage = null;
let canvasElements = [];

// 초기화
window.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded');
    canvas = document.getElementById('photocard-canvas');
    ctx = canvas.getContext('2d');
    
    await initAuth();
    initEventListeners();
    drawTemplate();
});

// 인증 초기화
async function initAuth() {
    try {
        const { data: { session }, error } = await sb.auth.getSession();
        console.log('Session check:', session, error);
        
        if (session) {
            currentUser = session.user;
            updateAuthUI();
            loadUserWorks();
        }
    } catch (error) {
        console.error('Init auth error:', error);
    }
}

function updateAuthUI() {
    if (currentUser) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('signup-btn').style.display = 'none';
        document.getElementById('user-info').style.display = 'flex';
        document.getElementById('user-email').textContent = currentUser.email;
        document.getElementById('my-works').style.display = 'block';
    } else {
        document.getElementById('login-btn').style.display = 'inline-block';
        document.getElementById('signup-btn').style.display = 'inline-block';
        document.getElementById('user-info').style.display = 'none';
        document.getElementById('my-works').style.display = 'none';
    }
}

// 이벤트 리스너
function initEventListeners() {
    // 모달
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    
    document.getElementById('login-btn').onclick = () => {
        loginModal.style.display = 'block';
        document.getElementById('login-error').textContent = '';
    };
    
    document.getElementById('signup-btn').onclick = () => {
        signupModal.style.display = 'block';
        document.getElementById('signup-error').textContent = '';
    };
    
    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = function() {
            this.closest('.modal').style.display = 'none';
        }
    });
    
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    };
    
    // 로그인/회원가입
    document.getElementById('login-submit').onclick = handleLogin;
    document.getElementById('signup-submit').onclick = handleSignup;
    document.getElementById('logout-btn').onclick = handleLogout;
    
    // 템플릿
    document.querySelectorAll('.template').forEach(t => {
        t.onclick = function() {
            document.querySelectorAll('.template').forEach(x => x.classList.remove('active'));
            this.classList.add('active');
            currentTemplate = this.dataset.template;
            drawTemplate();
        }
    });
    
    // 이미지 업로드
    document.getElementById('image-upload').onchange = handleImageUpload;
    
    // 텍스트
    document.getElementById('add-text-btn').onclick = addText;
    
    // 스티커
    document.querySelectorAll('.sticker').forEach(s => {
        s.onclick = function() {
            addSticker(this.dataset.sticker);
        }
    });
    
    // 저장/다운로드
    document.getElementById('save-btn').onclick = savePhotocard;
    document.getElementById('download-btn').onclick = downloadPhotocard;
}

// 로그인
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    console.log('Login attempt:', email);
    errorEl.textContent = '';
    
    if (!email || !password) {
        errorEl.textContent = '이메일과 비밀번호를 입력해주세요.';
        return;
    }
    
    try {
        const { data, error } = await sb.auth.signInWithPassword({ 
            email, 
            password 
        });
        
        console.log('Login result:', data, error);
        
        if (error) throw error;
        
        currentUser = data.user;
        updateAuthUI();
        document.getElementById('login-modal').style.display = 'none';
        loadUserWorks();
    } catch (error) {
        errorEl.textContent = '로그인 실패: ' + error.message;
        console.error('Login error:', error);
    }
}

// 회원가입
async function handleSignup() {
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const errorEl = document.getElementById('signup-error');
    
    console.log('Signup attempt:', email);
    errorEl.textContent = '';
    
    if (!email || !password) {
        errorEl.textContent = '이메일과 비밀번호를 입력해주세요.';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = '비밀번호는 최소 6자 이상이어야 합니다.';
        return;
    }
    
    try {
        const { data, error } = await sb.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        
        console.log('Signup result:', data, error);
        
        if (error) throw error;
        
        errorEl.style.color = 'green';
        errorEl.textContent = '회원가입 성공! 이메일 인증 없이 바로 로그인 가능합니다.';
        
        // 자동 로그인
        setTimeout(async () => {
            currentUser = data.user;
            updateAuthUI();
            document.getElementById('signup-modal').style.display = 'none';
        }, 1500);
    } catch (error) {
        errorEl.textContent = '회원가입 실패: ' + error.message;
        console.error('Signup error:', error);
    }
}

// 로그아웃
async function handleLogout() {
    await sb.auth.signOut();
    currentUser = null;
    updateAuthUI();
    document.getElementById('works-grid').innerHTML = '';
}

// 템플릿 그리기
function drawTemplate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const templates = {
        classic: () => {
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 10;
            ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        },
        modern: () => {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        },
        vintage: () => {
            ctx.fillStyle = '#f4e4c1';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#8b7355';
            ctx.lineWidth = 15;
            ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
        },
        minimal: () => {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    templates[currentTemplate]();
    
    if (uploadedImage) {
        const scale = Math.min(canvas.width / uploadedImage.width, (canvas.height * 0.6) / uploadedImage.height);
        const x = (canvas.width - uploadedImage.width * scale) / 2;
        const y = 100;
        ctx.drawImage(uploadedImage, x, y, uploadedImage.width * scale, uploadedImage.height * scale);
    }
    
    canvasElements.forEach(el => {
        if (el.type === 'text') {
            ctx.fillStyle = el.color;
            ctx.font = '40px Arial';
            ctx.fillText(el.text, el.x, el.y);
        } else if (el.type === 'sticker') {
            ctx.font = '60px Arial';
            ctx.fillText(el.emoji, el.x, el.y);
        }
    });
}

// 이미지 업로드
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            uploadedImage = img;
            drawTemplate();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 텍스트 추가
function addText() {
    const text = document.getElementById('text-input').value;
    const color = document.getElementById('text-color').value;
    
    if (!text) return;
    
    canvasElements.push({
        type: 'text',
        text: text,
        color: color,
        x: canvas.width / 2 - 100,
        y: canvas.height - 100
    });
    
    drawTemplate();
    document.getElementById('text-input').value = '';
}

// 스티커 추가
function addSticker(emoji) {
    canvasElements.push({
        type: 'sticker',
        emoji: emoji,
        x: Math.random() * (canvas.width - 100),
        y: Math.random() * (canvas.height - 100)
    });
    drawTemplate();
}

// 포토카드 저장
async function savePhotocard() {
    if (!currentUser) {
        alert('로그인이 필요합니다!');
        return;
    }
    
    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        const fileName = `photocard_${Date.now()}.png`;
        
        console.log('Uploading to storage...');
        
        // Storage에 업로드
        const { data: uploadData, error: uploadError } = await sb.storage
            .from('photocards')
            .upload(`${currentUser.id}/${fileName}`, blob);
        
        console.log('Upload result:', uploadData, uploadError);
        
        if (uploadError) throw uploadError;
        
        // DB에 기록
        const { error: dbError } = await sb
            .from('photocards')
            .insert({
                user_id: currentUser.id,
                file_path: uploadData.path,
                template: currentTemplate
            });
        
        console.log('DB insert result:', dbError);
        
        if (dbError) throw dbError;
        
        alert('저장 완료!');
        loadUserWorks();
    } catch (error) {
        alert('저장 실패: ' + error.message);
        console.error('Save error:', error);
    }
}

// 다운로드
function downloadPhotocard() {
    const link = document.createElement('a');
    link.download = `photocard_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// 사용자 작품 로드
async function loadUserWorks() {
    if (!currentUser) return;
    
    try {
        const { data, error } = await sb
            .from('photocards')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        console.log('Load works result:', data, error);
        
        if (error) throw error;
        
        const grid = document.getElementById('works-grid');
        grid.innerHTML = '';
        
        if (!data || data.length === 0) {
            grid.innerHTML = '<p style="color: #666;">아직 저장된 포토카드가 없습니다.</p>';
            return;
        }
        
        for (const work of data) {
            const { data: urlData } = sb.storage
                .from('photocards')
                .getPublicUrl(work.file_path);
            
            const item = document.createElement('div');
            item.className = 'work-item';
            item.innerHTML = `
                <img src="${urlData.publicUrl}" alt="Photocard">
                <button class="delete-btn" onclick="deleteWork('${work.id}')">삭제</button>
            `;
            grid.appendChild(item);
        }
    } catch (error) {
        console.error('Load works error:', error);
    }
}

// 작품 삭제
window.deleteWork = async function(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const { error } = await sb
            .from('photocards')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        loadUserWorks();
    } catch (error) {
        alert('삭제 실패: ' + error.message);
        console.error('Delete error:', error);
    }
}
