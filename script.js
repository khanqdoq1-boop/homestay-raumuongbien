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
let currentBranch = 'branch_default';
let currentRoom = 'don1'; 
let currentYear = 2026;
let currentMonth = 7;
let authMode = 'login';
let selectedForBook = [];   
let selectedForDelete = []; 

let previousBookingCount = -1; 

const defaultBranches = [ { id: 'branch_default', name: 'Cơ sở Chính' } ];
const defaultRooms = [
    { id: 'don1', name: 'Phòng Đơn', branchId: 'branch_default' },
    { id: 'doi1', name: 'Phòng Đôi 1', branchId: 'branch_default' },
    { id: 'doi2', name: 'Phòng Đôi 2', branchId: 'branch_default' }
];

database.ref('homestayDB_V4').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) db = data;
    else { db['admin'] = { password: 'admin', businessName: 'HOMESTAY RAU MUỐNG BIỂN', bookings: [], branches: [...defaultBranches], rooms: [...defaultRooms] }; saveData(); }
    
    if (currentUser && !db[currentUser]) logout();
    
    let hasDeletedOldData = false;
    let today = new Date(); today.setFullYear(today.getFullYear() - 1);
    let cutoffDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for(let user in db) {
        if(!db[user].bookings) db[user].bookings = [];
        if(!db[user].branches || db[user].branches.length === 0) { db[user].branches = [...defaultBranches]; hasDeletedOldData = true; }
        if(!db[user].rooms || db[user].rooms.length === 0) { db[user].rooms = [...defaultRooms]; hasDeletedOldData = true; }
        
        db[user].rooms.forEach(r => { if (!r.branchId) { r.branchId = 'branch_default'; hasDeletedOldData = true; } });
        db[user].bookings.forEach(b => { if (b.room === 'nguyen_can') { b.room = 'nguyen_can_branch_default'; hasDeletedOldData = true; } });

        let originalLength = db[user].bookings.length;
        db[user].bookings = db[user].bookings.filter(b => {
            let maxDate = b.dates.reduce((max, d) => d > max ? d : max, "0000-00-00");
            return maxDate >= cutoffDate; 
        });
        if(db[user].bookings.length !== originalLength) hasDeletedOldData = true;
    }
    
    if(hasDeletedOldData) saveData();
    
    if (currentUser && db[currentUser]) {
        let branchExists = db[currentUser].branches.find(br => br.id === currentBranch);
        if(!branchExists && db[currentUser].branches.length > 0) currentBranch = db[currentUser].branches[0].id;
        
        let roomExists = db[currentUser].rooms.find(r => r.id === currentRoom && r.branchId === currentBranch);
        let isNguyenCan = currentRoom === ('nguyen_can_' + currentBranch);
        
        if (!roomExists && !isNguyenCan) {
            let branchRooms = db[currentUser].rooms.filter(r => r.branchId === currentBranch);
            currentRoom = branchRooms.length > 0 ? branchRooms[0].id : ('nguyen_can_' + currentBranch);
        }
        
        let bName = db[currentUser].businessName || 'HỆ THỐNG QUẢN LÝ';
        document.getElementById('brand-name').innerText = bName.toUpperCase();

        let currentBookingCount = db[currentUser].bookings ? db[currentUser].bookings.length : 0;
        if (previousBookingCount !== -1 && currentBookingCount > previousBookingCount) {
            let newBooking = db[currentUser].bookings[db[currentUser].bookings.length - 1]; 
            let rName = 'Phòng';
            if (newBooking.room.startsWith('nguyen_can_')) rName = 'Thuê Nguyên Căn';
            else { let rObj = db[currentUser].rooms.find(r => r.id === newBooking.room); if(rObj) rName = rObj.name; }
            showNewBookingToast(`<b>${newBooking.guestName}</b><br>Đã đặt: ${rName}`);
        }
        previousBookingCount = currentBookingCount; 
    } else {
        document.getElementById('brand-name').innerText = 'HỆ THỐNG QUẢN LÝ';
        previousBookingCount = -1; 
    }
    
    renderBranches(); renderRooms(); renderCalendar();
    if(currentUser === 'admin' && document.getElementById('modal-admin').style.display === 'block') renderAdminList();
});

function showNewBookingToast(message) {
    let audio = new Audio('https://actions.google.com/sounds/v1/alarms/ding.ogg');
    audio.play().catch(e => console.log('Chặn Auto-play'));
    let toast = document.getElementById('toast-container');
    document.getElementById('toast-message').innerHTML = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 5000);
}

function saveData() { database.ref('homestayDB_V4').set(db); }

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('year-input').value = currentYear;
    document.getElementById('month-select').value = currentMonth;
    if (currentUser) {
        document.getElementById('nav-register').style.display = 'none'; document.getElementById('nav-login').style.display = 'none';
        document.getElementById('nav-logout').style.display = 'inline'; document.getElementById('nav-revenue').style.display = 'inline';
        document.getElementById('nav-edit-account').style.display = 'inline'; document.getElementById('admin-controls').style.display = 'block';
        if (currentUser === 'admin') document.getElementById('nav-admin').style.display = 'inline';
    }
});

function showCustomPrompt(title, label, isPassword, confirmCallback) {
    document.getElementById('prompt-title').innerText = title; document.getElementById('prompt-label').innerText = label;
    let inputEl = document.getElementById('prompt-input'); inputEl.value = ""; inputEl.type = isPassword ? "password" : "text";
    document.getElementById('prompt-confirm-btn').onclick = function() { let val = inputEl.value.trim(); confirmCallback(val); };
    document.getElementById('overlay').style.display = 'block'; document.getElementById('modal-custom-prompt').style.display = 'block';
    setTimeout(() => inputEl.focus(), 100);
}

function showCustomConfirm(title, message, confirmCallback) {
    document.getElementById('confirm-title').innerText = title; document.getElementById('confirm-message').innerHTML = message;
    document.getElementById('confirm-agree-btn').onclick = confirmCallback;
    document.getElementById('overlay').style.display = 'block'; document.getElementById('modal-custom-confirm').style.display = 'block';
}

function renderBranches() {
    const branchSelect = document.getElementById('branch-select');
    if (!currentUser || !db[currentUser]) { document.getElementById('branch-container').style.display = 'none'; return; }
    document.getElementById('branch-container').style.display = 'flex'; branchSelect.innerHTML = '';
    db[currentUser].branches.forEach(br => {
        let opt = document.createElement('option'); opt.value = br.id; opt.innerText = br.name;
        if (br.id === currentBranch) opt.selected = true; branchSelect.appendChild(opt);
    });
}

function switchBranch(branchId) {
    currentBranch = branchId;
    let branchRooms = db[currentUser].rooms.filter(r => r.branchId === currentBranch);
    if (branchRooms.length > 0) currentRoom = branchRooms[0].id; else currentRoom = 'nguyen_can_' + currentBranch;
    selectedForBook = []; selectedForDelete = []; renderRooms(); renderCalendar();
}

function promptAddBranch() {
    showCustomPrompt("Thêm Cơ Sở Mới", "Nhập tên Cơ sở/Nhà nghỉ:", false, function(bName) {
        if (!bName) return alert("Vui lòng không để trống!");
        let newBranchId = 'branch_' + Date.now();
        db[currentUser].branches.push({ id: newBranchId, name: bName });
        let newRoomId = 'room_' + Date.now();
        db[currentUser].rooms.push({ id: newRoomId, name: 'Phòng 1', branchId: newBranchId });
        currentBranch = newBranchId; currentRoom = newRoomId;
        saveData(); renderBranches(); renderRooms(); renderCalendar(); closeModals();
    });
}

function renderRooms() {
    const tabsContainer = document.getElementById('dynamic-room-tabs'); const roomActions = document.getElementById('room-actions-container'); const btnDeleteRoom = document.getElementById('btn-delete-room');
    if (!currentUser || !db[currentUser]) { tabsContainer.innerHTML = `<button class="tab active" data-id="don1">Phòng Đơn</button><button class="tab tab-nguyencan" data-id="nguyen_can">🌟 Nguyên Căn</button>`; if (roomActions) roomActions.style.display = 'none'; return; }
    if (roomActions) roomActions.style.display = 'flex'; tabsContainer.innerHTML = '';
    let branchRooms = db[currentUser].rooms.filter(r => r.branchId === currentBranch);
    branchRooms.forEach(room => {
        const btn = document.createElement('button'); btn.className = `tab ${room.id === currentRoom ? 'active' : ''}`; btn.innerText = room.name; btn.setAttribute('data-id', room.id);
        btn.onclick = () => switchRoom(room.id); tabsContainer.appendChild(btn);
    });
    let nguyenCanId = 'nguyen_can_' + currentBranch;
    const btnNguyenCan = document.createElement('button'); btnNguyenCan.className = `tab tab-nguyencan ${currentRoom === nguyenCanId ? 'active' : ''}`; btnNguyenCan.innerHTML = '🌟 Thuê Nguyên Căn'; btnNguyenCan.setAttribute('data-id', nguyenCanId);
    btnNguyenCan.onclick = () => switchRoom(nguyenCanId); tabsContainer.appendChild(btnNguyenCan);
    if (btnDeleteRoom) btnDeleteRoom.style.display = currentRoom === nguyenCanId ? 'none' : 'inline-block';
}

function promptAddRoom() {
    showCustomPrompt("Thêm Phòng Mới", "Nhập tên phòng:", false, function(roomName) {
        if (!roomName) return alert("Vui lòng không để trống!");
        let newRoomId = 'room_' + Date.now(); 
        db[currentUser].rooms.push({ id: newRoomId, name: roomName, branchId: currentBranch });
        currentRoom = newRoomId; saveData(); renderRooms(); renderCalendar(); closeModals();
    });
}

function deleteCurrentRoom() {
    if (currentRoom.startsWith('nguyen_can_')) return;
    let branchRooms = db[currentUser].rooms.filter(r => r.branchId === currentBranch);
    if (branchRooms.length <= 1) return alert("Phải giữ lại ít nhất 1 phòng!");
    let roomObj = db[currentUser].rooms.find(r => r.id === currentRoom);
    showCustomConfirm("Cảnh Báo Xóa Phòng", `Xóa <b>${roomObj.name}</b>?<br>Tất cả lịch sẽ bị XÓA VĨNH VIỄN!`, function() {
        db[currentUser].rooms = db[currentUser].rooms.filter(r => r.id !== currentRoom);
        db[currentUser].bookings = db[currentUser].bookings.filter(b => b.room !== currentRoom);
        let remaining = db[currentUser].rooms.filter(r => r.branchId === currentBranch);
        currentRoom = remaining[0].id; saveData(); renderRooms(); renderCalendar(); closeModals();
    });
}

function switchRoom(roomId) {
    currentRoom = roomId;
    document.querySelectorAll('#dynamic-room-tabs .tab').forEach(btn => { if(btn.getAttribute('data-id') === roomId) btn.classList.add('active'); else btn.classList.remove('active'); });
    const btnDeleteRoom = document.getElementById('btn-delete-room');
    if (btnDeleteRoom) btnDeleteRoom.style.display = currentRoom.startsWith('nguyen_can_') ? 'none' : 'inline-block';
    selectedForBook = []; selectedForDelete = []; renderCalendar();
}

function getBookingInfoForDate(dateStr) {
    if(!currentUser || !db[currentUser]) return { status: 'free' };
    let myRoomBooking = null; let wholeHouseBooking = null; let otherRoomBookings = []; let nguyenCanId = 'nguyen_can_' + currentBranch;
    for(let b of db[currentUser].bookings) {
        if (b.dates.includes(dateStr)) {
            if (b.room === currentRoom) myRoomBooking = b;
            else if (b.room === nguyenCanId) wholeHouseBooking = b;
            else { let r = db[currentUser].rooms.find(x => x.id === b.room); if (r && r.branchId === currentBranch) otherRoomBookings.push({ booking: b, roomName: r.name }); }
        }
    }
    if (currentRoom === nguyenCanId) {
        if (myRoomBooking) return { status: 'booked', booking: myRoomBooking };
        if (otherRoomBookings.length > 0) {
            let bookedRoomNames = otherRoomBookings.map(item => item.roomName);
            let uniqueNames = [...new Set(bookedRoomNames)];
            return { status: 'blocked', reason: `🔒 Đang vướng khách ở: ${uniqueNames.join(', ')}` };
        }
        return { status: 'free' };
    } else {
        if (myRoomBooking) return { status: 'booked', booking: myRoomBooking };
        if (wholeHouseBooking) return { status: 'blocked', reason: `🔒 Khóa: Đã cho thuê Nguyên Căn (${wholeHouseBooking.guestName})` };
        return { status: 'free' };
    }
}

function handleDayClick(dateStr, bookingInfo) {
    if(!currentUser) return alert("Vui lòng đăng nhập!");
    if (bookingInfo.status === 'blocked') return alert("⛔ Không thể thao tác!\n\n" + bookingInfo.reason);
    if (bookingInfo.status === 'booked') {
        let booking = bookingInfo.booking;
        if(selectedForDelete.includes(booking.id)) selectedForDelete = selectedForDelete.filter(id => id !== booking.id);
        else selectedForDelete.push(booking.id);
    } else {
        if(selectedForBook.includes(dateStr)) selectedForBook = selectedForBook.filter(d => d !== dateStr); 
        else selectedForBook.push(dateStr); 
    }
    renderCalendar();
}

function renderCalendar() {
    currentYear = parseInt(document.getElementById('year-input').value); currentMonth = parseInt(document.getElementById('month-select').value);
    const grid = document.getElementById('days-grid'); grid.innerHTML = '';
    let firstDay = new Date(currentYear, currentMonth, 1).getDay(); let daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

    let totalRevenue = 0;
    if (currentUser && db[currentUser]) {
        let branchRoomIds = db[currentUser].rooms.filter(r => r.branchId === currentBranch).map(r => r.id); branchRoomIds.push('nguyen_can_' + currentBranch); 
        db[currentUser].bookings.forEach(b => { if (branchRoomIds.includes(b.room) && !b.isPending) totalRevenue += b.price; });
    }

    for (let i = 1; i <= daysInMonth; i++) {
        let dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let bookingInfo = getBookingInfoForDate(dateStr);
        let dayDiv = document.createElement('div'); dayDiv.className = 'day'; dayDiv.innerText = i;

        if (bookingInfo.status === 'booked') {
            dayDiv.classList.add(bookingInfo.booking.isPending ? 'pending' : 'booked');
            if(selectedForDelete.includes(bookingInfo.booking.id)) dayDiv.classList.add('selected-delete');
            dayDiv.setAttribute('data-info', `👤 ${bookingInfo.booking.guestName} | 💰 ${bookingInfo.booking.price.toLocaleString()}đ`);
        } else if (bookingInfo.status === 'blocked') {
            dayDiv.classList.add('blocked'); dayDiv.setAttribute('data-info', bookingInfo.reason);
        } else {
            dayDiv.classList.add('empty'); if (selectedForBook.includes(dateStr)) dayDiv.classList.add('selected-book');
        }

        dayDiv.onclick = () => handleDayClick(dateStr, bookingInfo); grid.appendChild(dayDiv);
    }

    if(currentUser) {
        document.getElementById('nav-revenue').innerText = `Doanh Thu Cơ Sở: ${totalRevenue.toLocaleString()} VNĐ`;
        document.getElementById('btn-book-action').style.display = selectedForBook.length > 0 ? 'block' : 'none';
        let btnDelete = document.getElementById('btn-delete-action');
        if (selectedForDelete.length > 0) {
            btnDelete.style.display = 'block'; let names = db[currentUser].bookings.filter(b => selectedForDelete.includes(b.id)).map(b => b.guestName);
            let uniqueNames = [...new Set(names)]; btnDelete.innerText = `- Xóa Lịch Của: ${uniqueNames.join(', ')}`;
        } else btnDelete.style.display = 'none';
    }
    
    renderPendingApprovals();
    renderSidebar();
}

function changeMonth(step) {
    currentMonth += step; if (currentMonth < 0) { currentMonth = 11; currentYear--; } else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    document.getElementById('month-select').value = currentMonth; document.getElementById('year-input').value = currentYear; renderCalendar();
}

function openAuth(mode) {
    authMode = mode; document.getElementById('auth-title').innerText = mode === 'login' ? "Đăng Nhập" : "Đăng Ký Mới";
    document.getElementById('auth-business').style.display = mode === 'register' ? 'block' : 'none'; document.getElementById('auth-business').value = '';
    document.getElementById('auth-user').value = ''; document.getElementById('auth-pass').value = '';
    document.getElementById('overlay').style.display = 'block'; document.getElementById('modal-auth').style.display = 'block';
}

function submitAuth() {
    let u = document.getElementById('auth-user').value.trim(); let p = document.getElementById('auth-pass').value.trim(); let b = document.getElementById('auth-business').value.trim(); 
    if (authMode === 'register') {
        if(!u || !p || !b) return alert("Vui lòng điền đủ!"); if(u === 'admin') return alert("Tên này cấm!"); if(db[u]) return alert("Tài khoản tồn tại!");
        db[u] = { password: p, businessName: b, bookings: [], branches: [...defaultBranches], rooms: [...defaultRooms] };
        saveData(); alert("Đăng ký thành công!");
    } else {
        if(!u || !p) return alert("Điền đủ tài khoản mật khẩu!");
        if(db[u] && db[u].password === p) {
            currentUser = u; localStorage.setItem('homestay_loggedInUser', u);
            if (db[currentUser].branches && db[currentUser].branches.length > 0) currentBranch = db[currentUser].branches[0].id;
            let branchRooms = db[currentUser].rooms.filter(r => r.branchId === currentBranch); currentRoom = branchRooms.length > 0 ? branchRooms[0].id : ('nguyen_can_' + currentBranch);
            document.getElementById('nav-register').style.display = 'none'; document.getElementById('nav-login').style.display = 'none';
            document.getElementById('nav-logout').style.display = 'inline'; document.getElementById('nav-revenue').style.display = 'inline';
            document.getElementById('nav-edit-account').style.display = 'inline'; document.getElementById('admin-controls').style.display = 'block';
            if (currentUser === 'admin') document.getElementById('nav-admin').style.display = 'inline';
            let bName = db[currentUser].businessName || 'HỆ THỐNG QUẢN LÝ'; document.getElementById('brand-name').innerText = bName.toUpperCase();
            selectedForBook = []; selectedForDelete = []; renderBranches(); renderRooms(); renderCalendar();
        } else return alert("Sai thông tin!");
    }
    closeModals();
}

function logout() {
    currentUser = null; localStorage.removeItem('homestay_loggedInUser');
    document.getElementById('nav-register').style.display = 'inline'; document.getElementById('nav-login').style.display = 'inline';
    document.getElementById('nav-logout').style.display = 'none'; document.getElementById('nav-revenue').style.display = 'none';
    document.getElementById('nav-admin').style.display = 'none'; document.getElementById('nav-edit-account').style.display = 'none'; document.getElementById('admin-controls').style.display = 'none';
    document.getElementById('brand-name').innerText = 'HỆ THỐNG QUẢN LÝ';
    currentBranch = 'branch_default'; currentRoom = 'don1'; selectedForBook = []; selectedForDelete = []; previousBookingCount = -1; 
    renderBranches(); renderRooms(); renderCalendar();
}

function showAdmin() { if (currentUser !== 'admin') return alert("Chỉ Admin!"); renderAdminList(); document.getElementById('overlay').style.display = 'block'; document.getElementById('modal-admin').style.display = 'block'; }
function renderAdminList() { let list = document.getElementById('account-list'); list.innerHTML = ""; for(let user in db) { list.innerHTML += `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #ccc; padding: 8px 0;"><span>TK: <b>${user}</b> | MK: <b>${db[user].password}</b></span><button class="btn-cancel" onclick="editUserPassword('${user}')" style="border: 1px solid #000; padding: 2px 8px;">Sửa</button></div>`; } }
function editUserPassword(userToEdit) { showCustomPrompt("Đổi Mật Khẩu", `Mật khẩu mới cho "${userToEdit}":`, true, function(newPass) { if (newPass !== "") { db[userToEdit].password = newPass; saveData(); renderAdminList(); alert("Đổi thành công!"); } closeModals(); }); }
function showEditAccount() { document.getElementById('edit-business-name').value = db[currentUser].businessName || ''; let currentBranchObj = db[currentUser].branches.find(b => b.id === currentBranch); document.getElementById('edit-branch-name').value = currentBranchObj ? currentBranchObj.name : ''; document.getElementById('edit-password').value = ''; document.getElementById('overlay').style.display = 'block'; document.getElementById('modal-edit-account').style.display = 'block'; }
function submitEditAccount() { let newBName = document.getElementById('edit-business-name').value.trim(); let newBranchName = document.getElementById('edit-branch-name').value.trim(); let newPass = document.getElementById('edit-password').value.trim(); if(!newBName || !newBranchName) return alert("Không để trống!"); db[currentUser].businessName = newBName; document.getElementById('brand-name').innerText = newBName.toUpperCase(); let currentBranchObj = db[currentUser].branches.find(b => b.id === currentBranch); if (currentBranchObj) { currentBranchObj.name = newBranchName; } if(newPass) db[currentUser].password = newPass; saveData(); renderBranches(); alert("Thành công!"); closeModals(); }

function openBookModal() { if (selectedForBook.length === 0) return; selectedForBook.sort(); document.getElementById('book-dates-lbl').innerText = selectedForBook.join('\n'); document.getElementById('book-name').value = ''; document.getElementById('book-price').value = ''; document.getElementById('overlay').style.display = 'block'; document.getElementById('modal-book').style.display = 'block'; }
function submitBooking() { let name = document.getElementById('book-name').value; let price = parseInt(document.getElementById('book-price').value); if(!name || !price) return alert("Điền đủ tên và giá!"); db[currentUser].bookings.push({ id: Date.now(), room: currentRoom, dates: [...selectedForBook], guestName: name, price: price, isPending: false }); selectedForBook = []; saveData(); closeModals(); renderCalendar(); }
function deleteSelected() { if(selectedForDelete.length === 0) return; showCustomConfirm("Xóa Lịch Đặt Phòng", `Xóa <b>${selectedForDelete.length}</b> lịch đặt phòng đã chọn?`, function() { db[currentUser].bookings = db[currentUser].bookings.filter(b => !selectedForDelete.includes(b.id)); selectedForDelete = []; saveData(); renderCalendar(); closeModals(); }); }
function closeModals() { document.getElementById('overlay').style.display = 'none'; document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); }

function renderSidebar() {
    const listContainer = document.getElementById('booking-list-sidebar');
    if (!listContainer || !currentUser) return;
    let htmlConfirmed = '';
    if (db[currentUser] && db[currentUser].bookings) {
        let roomBookings = db[currentUser].bookings.filter(b => b.room === currentRoom); roomBookings.sort((a, b) => { return a.dates.sort()[0].localeCompare(b.dates.sort()[0]); });
        let confirmedBookings = roomBookings.filter(b => !b.isPending);
        if (confirmedBookings.length === 0) htmlConfirmed = '<p style="text-align:center; font-style:italic; font-size:13px;">Chưa có khách.</p>';
        else {
            confirmedBookings.forEach(b => {
                let sDates = [...b.dates].sort(); let dateDisplay = sDates.length > 1 ? `${sDates[0]} ➔ ${sDates[sDates.length - 1]}` : sDates[0];
                htmlConfirmed += `<div class="sidebar-item"><b>👤 ${b.guestName}</b><br>📅 ${dateDisplay}<br>💰 Tổng: ${b.price.toLocaleString()} VNĐ</div>`;
            });
        }
    }
    listContainer.innerHTML = htmlConfirmed;
}

// ================= HỆ THỐNG XÉT DUYỆT CỘT PHẢI =================
function renderPendingApprovals() {
    const panel = document.getElementById('pending-approvals-panel');
    const listContent = document.getElementById('pending-list-content');

    if (!currentUser || !db[currentUser] || !db[currentUser].bookings) { panel.style.display = 'none'; return; }
    let pendingBookings = db[currentUser].bookings.filter(b => b.isPending);
    if (pendingBookings.length === 0) { panel.style.display = 'none'; return; }

    panel.style.display = 'block';
    let html = '';
    pendingBookings.forEach(b => {
        let roomName = 'Phòng không xác định';
        if (b.room.startsWith('nguyen_can_')) roomName = '🌟 Thuê Nguyên Căn';
        else { let rObj = db[currentUser].rooms.find(r => r.id === b.room); if(rObj) roomName = rObj.name; }

        let sDates = [...b.dates].sort();
        let dateDisplay = sDates.length > 1 ? `${sDates[0]} ➔ ${sDates[sDates.length - 1]}` : sDates[0];
        let transferCode = 'C' + b.id.toString().slice(-6);

        html += `
        <div style="background: white; border-radius: 16px; padding: 18px; border-top: 5px solid #eab308; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
            <div style="text-align: left;">
                <b style="font-size: 16px; color: #1f2937; display: block; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 8px;">👤 ${b.guestName}</b>
                <div style="color: #4b5563; font-size: 14px; margin-top: 4px;">🏠 Phòng: <b>${roomName}</b></div>
                <div style="color: #4b5563; font-size: 14px; margin-top: 4px;">📅 Ngày: <b>${dateDisplay}</b></div>
                <div style="color: #b45309; font-size: 14px; margin-top: 12px; background: #fefce8; padding: 10px; border-radius: 8px; border: 1px dashed #fde047; text-align: center;">
                    Nội dung chuyển khoản:<br><b style="font-size:20px; letter-spacing: 1px; display: block; margin-top: 5px;">${transferCode}</b>
                </div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button class="btn-black btn-small" style="background: #059669; box-shadow: 0 4px 0 #064e3b; font-size: 13px; flex: 1; padding: 10px; text-transform: uppercase;" onclick="approveBooking(${b.id})">✅ Đã thu</button>
                <button class="btn-danger btn-small" style="font-size: 13px; flex: 1; padding: 10px; text-transform: uppercase;" onclick="rejectBooking(${b.id})">❌ Hủy</button>
            </div>
        </div>`;
    });
    listContent.innerHTML = html;
}

function approveBooking(bookingId) {
    showCustomConfirm("Xác Nhận Đã Thu Tiền", "Bạn xác nhận <b>ĐÃ NHẬN TIỀN</b> của khách này?<br><br>Phòng sẽ được khóa cứng.", function() {
        let b = db[currentUser].bookings.find(x => x.id === bookingId);
        if(b) { b.isPending = false; saveData(); renderCalendar(); closeModals(); }
    });
}
function rejectBooking(bookingId) {
    showCustomConfirm("Hủy Đơn", "Bạn muốn <b>HỦY</b> đơn này?<br>Lịch sẽ được nhả ra.", function() {
        db[currentUser].bookings = db[currentUser].bookings.filter(x => x.id !== bookingId); saveData(); renderCalendar(); closeModals();
    });
}

const glow = document.createElement('div'); glow.className = 'cursor-glow'; document.body.appendChild(glow);
document.addEventListener('mousemove', (e) => { requestAnimationFrame(() => { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; }); });
