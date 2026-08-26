// ==========================================
// 1. CẤU HÌNH FIREBASE TỪ DỰ ÁN CỦA BẠN
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyC0oO7zUHDCogpa5a7yxCXEJGNXyHVjZHo",
    authDomain: "ql-homestay.firebaseapp.com",
    projectId: "ql-homestay",
    storageBucket: "ql-homestay.firebasestorage.app",
    messagingSenderId: "199678837950",
    appId: "1:199678837950:web:26840b86245b97c17d8aef",
    measurementId: "G-8YGEFQPMBZ",
    databaseURL: "https://ql-homestay-default-rtdb.firebaseio.com" // Đường dẫn bắt buộc cho Realtime Database
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==========================================
// 2. BIẾN TOÀN CỤC
// ==========================================
let db = {};
let currentUser = null;
let currentRoom = 'don1';
let currentYear = 2026;
let currentMonth = 7; // Tháng 8
let authMode = 'login';

let selectedForBook = [];   
let selectedForDelete = []; 

// ==========================================
// 3. ĐỒNG BỘ DỮ LIỆU & TỰ ĐỘNG DỌN LỊCH CŨ 1 NĂM
// ==========================================
database.ref('homestayDB_V4').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        db = data;
    } else {
        // Nếu database hoàn toàn trống, tự tạo tài khoản admin mặc định
        db['admin'] = { password: 'admin', bookings: [] };
        saveData();
    }
    
    let hasDeletedOldData = false;
    
    // Lấy ngày hôm nay và lùi lại đúng 1 năm
    let today = new Date();
    today.setFullYear(today.getFullYear() - 1);
    let cutoffDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Đảm bảo mảng bookings luôn tồn tại và tiến hành lọc bỏ lịch cũ
    for(let user in db) {
        if(!db[user].bookings) db[user].bookings = [];
        
        let originalLength = db[user].bookings.length;
        
        // Quét và xóa các lịch cũ
        db[user].bookings = db[user].bookings.filter(b => {
            // Lấy ngày trả phòng cuối cùng trong chuỗi ngày khách đặt
            let maxDate = b.dates.reduce((max, d) => d > max ? d : max, "0000-00-00");
            // Chỉ giữ lại lịch nếu ngày trả phòng lớn hơn hoặc bằng mốc 1 năm trước
            return maxDate >= cutoffDate; 
        });
        
        // Đánh dấu nếu có dữ liệu cũ vừa bị xóa khỏi mảng
        if(db[user].bookings.length !== originalLength) {
            hasDeletedOldData = true;
        }
    }
    
    // Nếu có dọn dẹp lịch cũ, đẩy dữ liệu mới (đã sạch) lên lại Firebase
    if(hasDeletedOldData) {
        saveData();
    }
    
    // Cập nhật lại giao diện ngay khi có dữ liệu mới từ người khác (hoặc tải trang)
    renderCalendar();
    
    // Cập nhật cả danh sách quản lý nếu Admin đang mở
    if(currentUser === 'admin' && document.getElementById('modal-admin').style.display === 'block') {
        renderAdminList();
    }
});

function saveData() { 
    // Đẩy dữ liệu lên Firebase thay vì lưu ở máy
    database.ref('homestayDB_V4').set(db); 
}

// ==========================================
// 4. CODE XỬ LÝ GIAO DIỆN VÀ LOGIC (GIỮ NGUYÊN)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('year-input').value = currentYear;
    document.getElementById('month-select').value = currentMonth;
    // Không cần gọi renderCalendar() ở đây nữa vì Firebase sẽ gọi tự động khi lấy xong dữ liệu
});

function switchRoom(room) {
    currentRoom = room;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + room).classList.add('active');
    
    selectedForBook = [];
    selectedForDelete = [];
    renderCalendar();
}

function changeMonth(step) {
    currentMonth += step;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    document.getElementById('month-select').value = currentMonth;
    document.getElementById('year-input').value = currentYear;
    renderCalendar();
}

function getBookingForDate(dateStr) {
    if(!currentUser || !db[currentUser]) return null;
    for(let b of db[currentUser].bookings) {
        if(b.room === currentRoom && b.dates.includes(dateStr)) {
            return b;
        }
    }
    return null;
}

function handleDayClick(dateStr, booking) {
    if(!currentUser) return alert("Vui lòng đăng nhập để thao tác!");

    if (booking) {
        if(selectedForDelete.includes(booking.id)) {
            selectedForDelete = selectedForDelete.filter(id => id !== booking.id);
        } else {
            selectedForDelete.push(booking.id);
        }
    } else {
        if(selectedForBook.includes(dateStr)) {
            selectedForBook = selectedForBook.filter(d => d !== dateStr); 
        } else {
            selectedForBook.push(dateStr); 
        }
    }
    renderCalendar();
}

function renderCalendar() {
    currentYear = parseInt(document.getElementById('year-input').value);
    currentMonth = parseInt(document.getElementById('month-select').value);
    const grid = document.getElementById('days-grid');
    grid.innerHTML = '';
    
    let firstDay = new Date(currentYear, currentMonth, 1).getDay();
    let daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

    let totalRevenue = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
        let dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let booking = getBookingForDate(dateStr);
        
        let dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        dayDiv.innerText = i;

        if (booking) {
            dayDiv.classList.add('booked');
            if(selectedForDelete.includes(booking.id)) dayDiv.classList.add('selected-delete');
        } else {
            dayDiv.classList.add('empty');
            if (selectedForBook.includes(dateStr)) dayDiv.classList.add('selected-book');
        }

        dayDiv.onclick = () => handleDayClick(dateStr, booking);
        grid.appendChild(dayDiv);
    }

    if(currentUser) {
        db[currentUser].bookings.forEach(b => totalRevenue += b.price);
        document.getElementById('nav-revenue').innerText = `Doanh Thu: ${totalRevenue.toLocaleString()} VNĐ`;
        
        document.getElementById('btn-book-action').style.display = selectedForBook.length > 0 ? 'block' : 'none';
        document.getElementById('btn-delete-action').style.display = selectedForDelete.length > 0 ? 'block' : 'none';
    }
}

// ================= TÀI KHOẢN =================
function openAuth(mode) {
    authMode = mode;
    document.getElementById('auth-title').innerText = mode === 'login' ? "Đăng Nhập" : "Đăng Ký Mới";
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('modal-auth').style.display = 'block';
}

function submitAuth() {
    let u = document.getElementById('auth-user').value.trim();
    let p = document.getElementById('auth-pass').value.trim();
    if(!u || !p) return alert("Vui lòng điền đủ thông tin");

    if (authMode === 'register') {
        if(u === 'admin') return alert("Tên đăng nhập này không được phép sử dụng!");
        if(db[u]) return alert("Tài khoản đã tồn tại!");
        db[u] = { password: p, bookings: [] };
        saveData();
        alert("Đăng ký thành công!");
    } else {
        if(db[u] && db[u].password === p) {
            currentUser = u;
            document.getElementById('nav-register').style.display = 'none';
            document.getElementById('nav-login').style.display = 'none';
            document.getElementById('nav-logout').style.display = 'inline';
            document.getElementById('nav-revenue').style.display = 'inline';
            document.getElementById('nav-changepass').style.display = 'inline';
            document.getElementById('admin-controls').style.display = 'block';
            
            if (currentUser === 'admin') {
                document.getElementById('nav-admin').style.display = 'inline';
            } else {
                document.getElementById('nav-admin').style.display = 'none';
            }
            
            selectedForBook = [];
            selectedForDelete = [];
            renderCalendar();
        } else {
            return alert("Sai thông tin!");
        }
    }
    closeModals();
}

function logout() {
    currentUser = null;
    document.getElementById('nav-register').style.display = 'inline';
    document.getElementById('nav-login').style.display = 'inline';
    document.getElementById('nav-logout').style.display = 'none';
    document.getElementById('nav-revenue').style.display = 'none';
    document.getElementById('nav-admin').style.display = 'none';
    document.getElementById('nav-changepass').style.display = 'none';
    document.getElementById('admin-controls').style.display = 'none';
    
    selectedForBook = [];
    selectedForDelete = [];
    renderCalendar();
}

// ================= ADMIN QUẢN LÝ TÀI KHOẢN =================
function showAdmin() {
    if (currentUser !== 'admin') return alert("Chỉ Admin mới có quyền truy cập!");
    
    renderAdminList();
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('modal-admin').style.display = 'block';
}

function renderAdminList() {
    let list = document.getElementById('account-list');
    list.innerHTML = "";
    for(let user in db) {
        list.innerHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding: 8px 0;">
            <span>TK: <b>${user}</b> | MK: <b>${db[user].password}</b></span>
            <button class="btn-cancel" onclick="editUserPassword('${user}')" style="border: 1px solid #000; padding: 2px 8px;">Sửa</button>
        </div>`;
    }
}

function editUserPassword(userToEdit) {
    let newPass = prompt(`Nhập mật khẩu mới cho tài khoản "${userToEdit}":`);
    
    if (newPass !== null && newPass.trim() !== "") {
        db[userToEdit].password = newPass.trim();
        saveData();
        renderAdminList(); 
        alert(`Đã đổi mật khẩu cho tài khoản ${userToEdit} thành công!`);
    }
}

function showChangePass() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('modal-changepass').style.display = 'block';
}

function submitChangePass() {
    let np = document.getElementById('new-pass').value.trim();
    if(!np) return;
    db[currentUser].password = np;
    saveData();
    alert("Đổi thành công!");
    closeModals();
}

// ================= LƯU & XÓA LỊCH =================
function openBookModal() {
    if (selectedForBook.length === 0) return;
    selectedForBook.sort();
    
    document.getElementById('book-dates-lbl').innerText = selectedForBook.join('\n');
    document.getElementById('book-name').value = '';
    document.getElementById('book-price').value = '';

    document.getElementById('overlay').style.display = 'block';
    document.getElementById('modal-book').style.display = 'block';
}

function submitBooking() {
    let name = document.getElementById('book-name').value;
    let price = parseInt(document.getElementById('book-price').value);

    if(!name || !price) return alert("Vui lòng điền tên khách và tổng giá!");

    db[currentUser].bookings.push({
        id: Date.now(),
        room: currentRoom,
        dates: [...selectedForBook], 
        guestName: name,
        price: price
    });
    
    selectedForBook = []; 
    saveData();
    closeModals();
    renderCalendar();
}

function deleteSelected() {
    if(selectedForDelete.length === 0) return;
    if(!confirm(`Bạn muốn xóa ${selectedForDelete.length} lịch đặt phòng này?`)) return;

    db[currentUser].bookings = db[currentUser].bookings.filter(b => !selectedForDelete.includes(b.id));
    selectedForDelete = [];
    saveData();
    renderCalendar();
}

function closeModals() {
    document.getElementById('overlay').style.display = 'none';
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}
