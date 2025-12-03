/* ============================================================
   DATA STORAGE
============================================================ */
let currentUser = localStorage.getItem("currentUser") || null;
let tasks = JSON.parse(localStorage.getItem("tasks") || "{}");

// Mỗi user có danh sách riêng
function save() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

/* ============================================================
   AUTHENTICATION (GIẢ LẬP)
============================================================ */
// Giả lập database user trong localStorage
let users = JSON.parse(localStorage.getItem("users") || "{}");

function saveUsers() {
    localStorage.setItem("users", JSON.stringify(users));
}

document.getElementById("btn-login").onclick = () => {
    let email = document.getElementById("auth-email").value;
    let pass = document.getElementById("auth-pass").value;
    if (!users[email]) return alert("Sai tài khoản");
    if (users[email] !== pass) return alert("Sai mật khẩu");
    currentUser = email;
    localStorage.setItem("currentUser", email);
    showApp();
};

document.getElementById("btn-register").onclick = () => {
    let email = document.getElementById("reg-email").value;
    let pass = document.getElementById("reg-pass").value;
    if (users[email]) return alert("Email đã tồn tại");
    users[email] = pass;
    saveUsers();
    alert("Tạo tài khoản thành công!");
};

document.getElementById("switch-login").onclick = () => {
    document.getElementById("register-container").classList.add("hidden");
    document.getElementById("auth-container").classList.remove("hidden");
};
document.getElementById("switch-register").onclick = () => {
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("register-container").classList.remove("hidden");
};

function showApp() {
    document.getElementById("auth-container").classList.add("hidden");
    document.getElementById("register-container").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    if (!tasks[currentUser]) tasks[currentUser] = [];
    render();
}

if (currentUser) showApp();

/* ============================================================
   FILTER EVENT LISTENERS
============================================================ */
document.getElementById("filter").addEventListener("change", render);
document.getElementById("filter-date").addEventListener("change", render);

/* ============================================================
   ADD TASK MANUALLY
============================================================ */
document.getElementById("add-btn").onclick = () => {
    let title = document.getElementById("task-input").value.trim();
    let deadline = document.getElementById("deadline-input").value;

    if (!title) return alert("Nhập công việc");

    tasks[currentUser].push({
        id: Date.now(),
        title,
        deadline,
        completed: false
    });

    document.getElementById("task-input").value = "";
    document.getElementById("deadline-input").value = "";
    save();
    render();
};

/* ============================================================
   ADD TASK USING OPENAI NLP (MÔ PHỎNG)
============================================================ */
document.getElementById("nlp-btn").onclick = async () => {
    let text = document.getElementById("nlp-input").value.trim();
    if (!text) return;

    // =========================================
    // GỌI API OPENAI (Bạn tự thay URL và KEY)
    // =========================================
    // Đây chỉ là DEMO — bạn cần backend thật
    const mock = {
        title: "Đi báo cáo project 1",
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    tasks[currentUser].push({
        id: Date.now(),
        title: mock.title,
        deadline: mock.deadline,
        completed: false
    });

    document.getElementById("nlp-input").value = "";
    save();
    render();
};

/* ============================================================
   FORMAT DEADLINE HELPER
============================================================ */
function formatDeadline(deadline) {
    if (!deadline) return "Không có";
    
    // deadline format from datetime-local: "YYYY-MM-DDTHH:mm"
    const parts = deadline.split("T");
    const date = parts[0]; // YYYY-MM-DD
    const time = parts[1]; // HH:mm
    
    // If no time is provided, just show the date
    if (!time) {
        return date;
    }
    
    // If time is provided (00:00 is considered as time not set)
    if (time === "00:00") {
        return date;
    }
    
    // Convert to 12-hour format with AM/PM
    const [hours, minutes] = time.split(":");
    let hour12 = parseInt(hours);
    const ampm = hour12 >= 12 ? "PM" : "AM";
    if (hour12 > 12) {
        hour12 -= 12;
    } else if (hour12 === 0) {
        hour12 = 12;
    }
    
    const formattedTime = `${String(hour12).padStart(2, "0")}:${minutes} ${ampm}`;
    return `${date} ${formattedTime}`;
}

/* ============================================================
   RENDER TASK LIST
============================================================ */
function render() {
    let list = tasks[currentUser];
    let filterVal = document.getElementById("filter").value;
    let filterDateVal = document.getElementById("filter-date").value;
    let html = "";
    list
        .filter(t => {
            if (filterVal === "completed") return t.completed;
            if (filterVal === "pending") return !t.completed;
            return true;
        })
        .filter(t => {
            if (!filterDateVal) return true;
            return t.deadline && t.deadline.startsWith(filterDateVal);
        })
        .forEach(t => {
            html += `
            <div class="task-card">
                <div class="task-left">
                    <input type="checkbox" ${t.completed ? "checked" : ""}
                        onclick="toggle(${t.id})" />
                    <div>
                        <div class="${t.completed ? "completed" : ""}">
                            ${t.title}
                        </div>
                        <small>⌛ ${formatDeadline(t.deadline)}</small>
                    </div>
                </div>

                <div class="icons">
                    <i class="fa-solid fa-pen-to-square" id="icon-btn" onclick="editTask(${t.id})"></i>
                    <i class="fa-solid fa-trash-can" id="icon-btn" onclick="del(${t.id})"></i>
                </div>
            </div>
            `;
        });

    document.getElementById("task-list").innerHTML = html;
}

/* ============================================================
   TASK OPERATIONS
============================================================ */
function toggle(id) {
    let t = tasks[currentUser].find(x => x.id === id);
    t.completed = !t.completed;
    save();
    render();
}

function del(id) {
    tasks[currentUser] = tasks[currentUser].filter(x => x.id !== id);
    save();
    render();
}

function editTask(id) {
    let t = tasks[currentUser].find(x => x.id === id);
    
    // Create a modal for editing
    const modal = document.createElement("div");
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const editBox = document.createElement("div");
    editBox.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        width: 90%;
        max-width: 400px;
    `;
    
    editBox.innerHTML = `
        <h3>Sửa công việc</h3>
        <label>Tên công việc:</label>
        <input id="edit-title" type="text" value="${t.title}" style="width: 100%; padding: 8px; margin-bottom: 12px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box;" />
        
        <label>Thời gian nhắc nhở:</label>
        <input id="edit-deadline" type="datetime-local" value="${t.deadline}" style="width: 100%; padding: 8px; margin-bottom: 12px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box;" />
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancel-edit" style="background: #ccc; color: #333;">Hủy</button>
            <button id="save-edit" style="background: #4a8af4; color: white;">Lưu</button>
        </div>
    `;
    
    modal.appendChild(editBox);
    document.body.appendChild(modal);
    
    document.getElementById("save-edit").onclick = () => {
        const newTitle = document.getElementById("edit-title").value.trim();
        const newDeadline = document.getElementById("edit-deadline").value;
        
        if (!newTitle) {
            alert("Nhập tên công việc");
            return;
        }
        
        t.title = newTitle;
        t.deadline = newDeadline;
        save();
        render();
        modal.remove();
    };
    
    document.getElementById("cancel-edit").onclick = () => {
        modal.remove();
    };
}

/* ============================================================
   LOGOUT
============================================================ */
document.getElementById("logout-btn").onclick = () => {
    localStorage.removeItem("currentUser");
    location.reload();
};
