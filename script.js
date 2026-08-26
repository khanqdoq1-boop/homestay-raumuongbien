const firebaseConfig = {
    apiKey: "AIzaSyC0oO7zUHDCogpa5a7yxCXEJGNXyHVjZHo",
    authDomain: "ql-homestay.firebaseapp.com",
    projectId: "ql-homestay",
    storageBucket: "ql-homestay.firebasestorage.app",
    messagingSenderId: "199678837950",
    appId: "1:199678837950:web:26840b86245b97c17d8aef",
    measurementId: "G-8YGEFQPMBZ",
    databaseURL: "https://ql-homestay-default-rtdb.firebaseio.com"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let db = {};
let currentUser = localStorage.getItem('homestay_loggedInUser') || null; 
let currentRoom = 'don1'; 
let currentYear = 2026;
let currentMonth = 7;
let authMode = 'login';
let selectedForBook = [];   
let selectedForDelete = []; 

const defaultRooms = [
    { id: 'don1', name: 'Phòng Đơn' },
    { id: 'doi1', name: 'Phòng Đôi 1' },
    { id: 'doi2', name: 'Phòng Đôi 2' }
];

database.ref('homestayDB_V4').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        db = data;
    } else {
        db['admin'] = { password: 'admin', businessName: 'HOMESTAY RAU MUỐNG BIỂN - NINH HÒA', bookings: [], rooms: [...defaultRooms] };
        saveData();
    }
    
    if (currentUser && !db[currentUser]) {
        logout();
    }
    
    let hasDeletedOldData = false;
    let today = new Date();
    today.setFullYear(today.getFullYear() - 1);
    let cutoffDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for(let user in db) {
        if(!db[user].bookings) db[user].bookings = [];
        if(!db[user].rooms || db[user].rooms.length === 0) {
            db[user].rooms = [...defaultRooms];
            hasDeletedOldData = true; 
        }
        
        let originalLength = db[user].bookings.length;
        db[user].bookings = db[user].bookings.filter(b => {
            let maxDate = b.dates.reduce((max, d) => d > max ? d : max, "0000-00-00");
            return maxDate >= cutoffDate; 
        });
        
        if(db[user].bookings.length !== originalLength) hasDeletedOldData = true;
    }
    
    if(hasDeletedOldData) saveData();
    
    if (currentUser && db[currentUser]) {
        let roomExists = db[currentUser].rooms.find(r => r.id === currentRoom);
        if (!roomExists && db[currentUser].rooms.length > 0) {
            currentRoom = db[currentUser].rooms[0].id;
        }
        
        let bName = db[currentUser].businessName || 'HỆ THỐNG QUẢN LÝ';
        document.getElementById('brand-name').innerText = bName.toUpperCase();
    } else {
        document.getElementById('brand-name').innerText = 'HỆ THỐNG QUẢN LÝ';
    }
    
    renderRooms();
    renderCalendar();
    
    if(currentUser === 'admin' && document.getElementById('modal-admin').style.display === 'block') {
        renderAdminList();
    }
});

function saveData() { database.ref('homestayDB_V4').set(db); }

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('year-input').value = currentYear;
    document.getElementById('month-select').value = currentMonth;
    
    if (currentUser) {
        document.getElementById('nav-register').style.display = 'none';
        document.getElementById('nav-login').style.display = 'none';
        document.getElementById('nav-logout').style.display = 'inline';
        document.getElementById('nav-revenue').style.display = 'inline';
        document.getElementById('nav-edit-account').style.display = 'inline'; // Hiển thị nút Tài khoản
        document.getElementById('admin-controls').style.display = 'block';
        
        if (currentUser === 'admin') document.getElementById('nav-admin').style.display = 'inline';
    }
});

// ================= QUẢN LÝ PHÒNG ĐỘNG =================
function renderRooms() {
    const tabsContainer = document.getElementById('dynamic-room-tabs');
    const roomActions = document.getElementById('room-actions-container');
    
    if (!currentUser || !db[currentUser]) {
        tabsContainer.innerHTML = `
            <button class="tab active">Phòng Đơn</button>
            <button class="tab">Phòng Đôi 1</button>
            <button class="tab">Phòng Đôi 2</button>
        `;
        if (roomActions) roomActions.style.display = 'none';
        return;
    }

    if (roomActions) roomActions.style.display = 'flex';
    tabsContainer.innerHTML = '';
    
    db[currentUser].rooms.forEach(room => {
        const btn = document.createElement('button');
        btn.className = `tab ${room.id === currentRoom ? 'active' : ''}`;
        btn.innerText = room.name;
        btn.onclick = () => switchRoom(room.id);
        tabsContainer.appendChild(btn);
    });
}

function promptAddRoom() {
    let roomName = prompt("Nhập tên phòng mới (Ví dụ: Phòng VIP, Phòng Đôi 3...):");
    if (!roomName || roomName.trim() === "") return;
    
    let newRoomId = 'room_' + Date.now(); 
    db[currentUser].rooms.push({ id: newRoomId, name: roomName.trim() });
    
    currentRoom = newRoomId; 
    saveData();
    renderRooms();
    renderCalendar();
}

function deleteCurrentRoom() {
    if (db[currentUser].rooms.length <= 1) {
        return alert("Phải giữ lại ít nhất 1 phòng trong hệ thống!");
    }
    
    let roomObj = db[currentUser].rooms.find(r => r.id === currentRoom);
    if (!confirm(`CẢNH BÁO: Bạn chắc chắn muốn xóa "${roomObj.name}"?\n\nTất cả lịch khách đặt của phòng này cũng sẽ bị XÓA VĨNH VIỄN!`)) return;

    db[currentUser].rooms = db[currentUser].rooms.filter(r => r.id !== currentRoom);
    db[currentUser].bookings = db[currentUser].bookings.filter(b => b.room !== currentRoom);
    
    currentRoom = db[currentUser].rooms[0].id;
    
    saveData();
    renderRooms();
    renderCalendar();
}

function switchRoom(roomId) {
    currentRoom = roomId;
    renderRooms(); 
    selectedForBook = [];
    selectedForDelete = [];
    renderCalendar();
}

// ================= CODE LỊCH =================
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
        if(b.room === currentRoom && b.dates.includes(dateStr)) return b;
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
    renderSidebar();
}

// ================= TÀI KHOẢN VÀ MENU =================
function openAuth(mode) {
    authMode = mode;
    document.getElementById('auth-title').innerText = mode === 'login' ? "Đăng Nhập" : "Đăng Ký Mới";
    
    document.getElementById('auth-business').style.display = mode === 'register' ? 'block' : 'none';
    document.getElementById('auth-business').value = '';
    document.getElementById('auth-user').value = '';
    document.getElementById('auth-pass').value = '';
    
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('modal-auth').style.display = 'block';
}

function submitAuth() {
    let u = document.getElementById('auth-user').value.trim();
    let p = document.getElementById('auth-pass').value.trim();
    let b = document.getElementById('auth-business').value.trim(); 

    if (authMode === 'register') {
        if(!u || !p || !b) return alert("Vui lòng điền đủ Tên Doanh Nghiệp, Tài khoản và Mật khẩu!");
        if(u === 'admin') return alert("Tên đăng nhập này không được phép sử dụng!");
        if(db[u]) return alert("Tài khoản đã tồn tại!");
        
        db[u] = { password: p, businessName: b, bookings: [], rooms: [...defaultRooms] };
        saveData();
        alert("Đăng ký thành công!");
    } else {
        if(!u || !p) return alert("Vui lòng điền đủ tài khoản và mật khẩu!");
        if(db[u] && db[u].password === p) {
            currentUser = u;
            localStorage.setItem('homestay_loggedInUser', u);
            
            if (db[currentUser].rooms && db[currentUser].rooms.length > 0) {
                currentRoom = db[currentUser].rooms[0].id;
            }
            
            document.getElementById('nav-register').style.display = 'none';
            document.getElementById('nav-login').style.display = 'none';
            document.getElementById('nav-logout').style.display = 'inline';
            document.getElementById('nav-revenue').style.display = 'inline';
            document.getElementById('nav-edit-account').style.display = 'inline';
            document.getElementById('admin-controls').style.display = 'block';
            if (currentUser === 'admin') document.getElementById('nav-admin').style.display = 'inline';
            
            let bName = db[currentUser].businessName || 'HỆ THỐNG QUẢN LÝ';
            document.getElementById('brand-name').innerText = bName.toUpperCase();
            
            selectedForBook = [];
            selectedForDelete = [];
            renderRooms();
            renderCalendar();
        } else {
            return alert("Sai thông tin!");
        }
    }
    closeModals();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('homestay_loggedInUser');
    document.getElementById('nav-register').style.display = 'inline';
    document.getElementById('nav-login').style.display = 'inline';
    document.getElementById('nav-logout').style.display = 'none';
    document.getElementById('nav-revenue').style.display = 'none';
    document.getElementById('nav-admin').style.display = 'none';
    document.getElementById('nav-edit-account').style.display = 'none';
    document.getElementById('admin-controls').style.display = 'none';
    
    document.getElementById('brand-name').innerText = 'HỆ THỐNG QUẢN LÝ';
    
    currentRoom = 'don1'; 
    selectedForBook = [];
    selectedForDelete = [];
    renderRooms();
    renderCalendar();
}

// ================= ADMIN QUẢN LÝ =================
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

// ================= SỬA THÔNG TIN TÀI KHOẢN (MỚI) =================
function showEditAccount() { 
    // Tự động điền Tên doanh nghiệp hiện tại vào ô nhập
    document.getElementById('edit-business-name').value = db[currentUser].businessName || '';
    document.getElementById('edit-password').value = ''; // Để trống ô mật khẩu
    
    document.getElementById('overlay').style.display = 'block'; 
    document.getElementById('modal-edit-account').style.display = 'block'; 
}

function submitEditAccount() {
    let newBName = document.getElementById('edit-business-name').value.trim();
    let newPass = document.getElementById('edit-password').value.trim();
    
    if(!newBName) return alert("Tên doanh nghiệp không được để trống!");
    
    // 1. Lưu Tên doanh nghiệp mới
    db[currentUser].businessName = newBName;
    document.getElementById('brand-name').innerText = newBName.toUpperCase(); // Đổi UI trên góc trái ngay lập tức
    
    // 2. Chỉ lưu mật khẩu nếu người dùng có gõ chữ vào
    if(newPass) {
        db[currentUser].password = newPass;
    }
    
    saveData();
    alert("Cập nhật thông tin thành công!");
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

function renderSidebar() {
    const sidebar = document.getElementById('sidebar-container');
    const listContainer = document.getElementById('booking-list-sidebar');
    
    if (!sidebar || !listContainer) return;
    if (!currentUser) { sidebar.style.display = 'none'; return; }
    
    sidebar.style.display = 'block';
    let html = '';
    
    if (db[currentUser] && db[currentUser].bookings) {
        let roomBookings = db[currentUser].bookings.filter(b => b.room === currentRoom);
        if (roomBookings.length === 0) {
            html = '<p style="text-align:center; font-style:italic;">Chưa có khách đặt.</p>';
        } else {
            roomBookings.sort((a, b) => { return a.dates.sort()[0].localeCompare(b.dates.sort()[0]); });
            roomBookings.forEach(b => {
                let sortedDates = [...b.dates].sort();
                let dateDisplay = sortedDates.length > 1 ? `${sortedDates[0]} ➔ ${sortedDates[sortedDates.length - 1]}` : sortedDates[0];
                html += `<div class="sidebar-item"><b>👤 ${b.guestName}</b><br>📅 ${dateDisplay}<br>💰 ${b.price.toLocaleString()} VNĐ</div>`;
            });
        }
    }
    listContainer.innerHTML = html;
}
