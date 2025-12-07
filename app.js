// App logic: authentication, Firestore CRUD for students & results
const authPanel = document.getElementById('authPanel');
const appPanel = document.getElementById('appPanel');
const welcome = document.getElementById('welcome');
const mainArea = document.getElementById('mainArea');

const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');

const navDashboard = document.getElementById('navDashboard');
const navStudents = document.getElementById('navStudents');
const navResults = document.getElementById('navResults');
const navReports = document.getElementById('navReports');

let currentUser = null;

loginBtn.addEventListener('click', ()=> {
  const email = emailEl.value.trim(), pwd = passwordEl.value;
  if(!email||!pwd) return alert('Enter email and password');
  auth.signInWithEmailAndPassword(email,pwd).catch(e=>alert(e.message));
});

registerBtn.addEventListener('click', ()=> {
  const email = emailEl.value.trim(), pwd = passwordEl.value;
  if(!email||!pwd) return alert('Enter email and password');
  auth.createUserWithEmailAndPassword(email,pwd).then(cred=>{
    // create teacher profile
    db.collection('teachers').doc(cred.user.uid).set({email:email, createdAt: new Date()});
  }).catch(e=>alert(e.message));
});

logoutBtn.addEventListener('click', ()=> auth.signOut());

auth.onAuthStateChanged(user=>{
  if(user){
    currentUser = user;
    authPanel.classList.add('hidden');
    appPanel.classList.remove('hidden');
    welcome.innerText = 'Karibu, ' + (user.email||'Mwalimu');
    showDashboard();
  } else {
    currentUser = null;
    authPanel.classList.remove('hidden');
    appPanel.classList.add('hidden');
  }
});

navDashboard.addEventListener('click', showDashboard);
navStudents.addEventListener('click', showStudents);
navResults.addEventListener('click', showResults);
navReports.addEventListener('click', showReports);

// Dashboard
function showDashboard(){
  mainArea.innerHTML = `<h2>Dashboard</h2><div class="small">Loading summary...</div>`;
  Promise.all([
    db.collection('students').get(),
    db.collection('results').get()
  ]).then(([sres,rres])=>{
    const students = sres.size;
    const results = rres.size;
    mainArea.innerHTML = `<h2>Dashboard</h2>
      <div class="small">Students: ${students} • Results entries: ${results}</div>
      <div style="margin-top:12px">
        <button onclick="showStudents()">Manage Students</button>
        <button onclick="showResults()">Enter Results</button>
      </div>`;
  }).catch(e=> mainArea.innerHTML = '<div class="small">Error loading dashboard</div>');
}

// Students management
function showStudents(){
  mainArea.innerHTML = `<h2>Students</h2>
    <div class="card">
      <input id="stu_name" placeholder="Student full name" />
      <input id="stu_index" placeholder="Index number (eg: 001)" />
      <select id="stu_class"><option value="Form1">Form1</option><option value="Form2">Form2</option><option value="Form3">Form3</option><option value="Form4">Form4</option></select>
      <div class="row"><button id="addStudentBtn">Add Student</button> <button id="exportStudents">Export CSV</button></div>
    </div>
    <div id="studentsList"></div>`;
  document.getElementById('addStudentBtn').addEventListener('click', ()=>{
    const name = document.getElementById('stu_name').value.trim();
    const index = document.getElementById('stu_index').value.trim();
    const cls = document.getElementById('stu_class').value;
    if(!name||!index) return alert('Enter name and index');
    db.collection('students').add({name,index,cls,createdBy: currentUser.uid, createdAt:new Date()}).then(()=>{ alert('Added'); showStudents();});
  });
  document.getElementById('exportStudents').addEventListener('click', async ()=>{
    const snap = await db.collection('students').get();
    let csv = 'index,name,class\\n';
    snap.forEach(doc=> { const d=doc.data(); csv += `${d.index},"${d.name}",${d.cls}\\n`; });
    downloadText(csv,'students.csv');
  });
  renderStudentsList();
}

function renderStudentsList(){
  const list = document.getElementById('studentsList');
  list.innerHTML = '<table class="table"><thead><tr><th>Index</th><th>Name</th><th>Class</th><th></th></tr></thead><tbody id="stuBody"></tbody></table>';
  db.collection('students').orderBy('index').get().then(snap=>{
    const body = document.getElementById('stuBody'); body.innerHTML='';
    snap.forEach(doc=> {
      const d = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.index}</td><td>${d.name}</td><td>${d.cls}</td>
        <td><button onclick="viewStudent('${doc.id}')">Open</button></td>`;
      body.appendChild(tr);
    });
  });
}

window.viewStudent = function(id){
  db.collection('students').doc(id).get().then(doc=>{
    if(!doc.exists) return alert('Not found');
    const d = doc.data();
    mainArea.innerHTML = `<h2>Student: ${d.name}</h2><div class="small">Index: ${d.index} • Class: ${d.cls}</div>
      <div style="margin-top:12px"><button onclick="showAddResultFor('${id}')">Add result</button> <button onclick="exportStudentResults('${id}')">Export Results CSV</button></div>
      <div id="studentResults" style="margin-top:12px"></div>`;
    renderStudentResults(id);
  });
}

function showAddResultFor(studentId){
  mainArea.innerHTML = `<h2>Add Result</h2>
    <div class="card">
      <input id="r_subject" placeholder="Subject (e.g. Mathematics)" />
      <input id="r_score" type="number" placeholder="Score (0-100)" />
      <input id="r_term" placeholder="Term (e.g. Term1)" />
      <input id="r_year" type="number" placeholder="Year (e.g. 2025)" value="${new Date().getFullYear()}" />
      <div class="row"><button id="saveResultBtn">Save Result</button> <button onclick="showStudents()">Back</button></div>
    </div>`;
  document.getElementById('saveResultBtn').addEventListener('click', ()=>{
    const subject = document.getElementById('r_subject').value.trim();
    const score = Number(document.getElementById('r_score').value);
    const term = document.getElementById('r_term').value.trim();
    const year = Number(document.getElementById('r_year').value);
    if(!subject || isNaN(score) || !term || isNaN(year)) return alert('Fill all fields correctly');
    db.collection('results').add({studentId, subject, score, term, year, teacherId: currentUser.uid, createdAt:new Date()})
      .then(()=> { alert('Saved'); renderStudentResults(studentId); });
  });
}

function renderStudentResults(studentId){
  const container = document.getElementById('studentResults') || document.createElement('div');
  container.innerHTML = '<div class="small">Loading results...</div>';
  db.collection('results').where('studentId','==',studentId).orderBy('year','desc').get().then(snap=>{
    if(snap.empty) { container.innerHTML = '<div class="small">No results yet.</div>'; if(!container.parentNode) document.getElementById('mainArea').appendChild(container); return; }
    let html = '<table class="table"><thead><tr><th>Year</th><th>Term</th><th>Subject</th><th>Score</th><th>By</th></tr></thead><tbody>';
    const promises = [];
    snap.forEach(doc=>{
      const d = doc.data();
      const p = db.collection('teachers').doc(d.teacherId).get().then(tdoc=>{
        const teacher = tdoc.exists ? tdoc.data().email : 'Unknown';
        html += `<tr><td>${d.year}</td><td>${d.term}</td><td>${d.subject}</td><td>${d.score}</td><td>${teacher}</td></tr>`;
      });
      promises.push(p);
    });
    Promise.all(promises).then(()=>{ html += '</tbody></table>'; container.innerHTML = html; if(!container.parentNode) document.getElementById('mainArea').appendChild(container); });
  });
}

function exportStudentResults(studentId){
  db.collection('results').where('studentId','==',studentId).get().then(snap=>{
    let csv = 'year,term,subject,score,teacher\\n';
    const promises=[];
    snap.forEach(doc=>{
      const d=doc.data();
      const p = db.collection('teachers').doc(d.teacherId).get().then(tdoc=>{
        const teacher = tdoc.exists? tdoc.data().email : '';
        csv += `${d.year},${d.term},${d.subject},${d.score},${teacher}\\n`;
      });
      promises.push(p);
    });
    Promise.all(promises).then(()=> downloadText(csv,'results.csv'));
  });
}

function showResults(){
  mainArea.innerHTML = `<h2>Enter Results</h2><div class="card">
    <input id="res_student_index" placeholder="Student index e.g. 001" />
    <input id="res_subject" placeholder="Subject e.g. Mathematics" />
    <input id="res_score" type="number" placeholder="Score" />
    <input id="res_term" placeholder="Term e.g. Term1" />
    <input id="res_year" type="number" value="${new Date().getFullYear()}" />
    <div class="row"><button id="saveQuickResult">Save</button> <button onclick="showDashboard()">Back</button></div>
  </div>`;
  document.getElementById('saveQuickResult').addEventListener('click', async ()=>{
    const idx = document.getElementById('res_student_index').value.trim();
    const subject = document.getElementById('res_subject').value.trim();
    const score = Number(document.getElementById('res_score').value);
    const term = document.getElementById('res_term').value.trim();
    const year = Number(document.getElementById('res_year').value);
    if(!idx||!subject||isNaN(score)) return alert('Fill fields correctly');
    // find student by index
    const snap = await db.collection('students').where('index','==',idx).get();
    if(snap.empty) return alert('Student not found (index)');
    const studentId = snap.docs[0].id;
    db.collection('results').add({studentId, subject, score, term, year, teacherId: currentUser.uid, createdAt:new Date()}).then(()=> alert('Saved'));
  });
}

function showReports(){
  mainArea.innerHTML = `<h2>Reports</h2>
    <div class="card">
      <input id="r_class" placeholder="Class (e.g. Form4)" />
      <input id="r_year_report" type="number" value="${new Date().getFullYear()}" />
      <div class="row"><button id="genReport">Generate Class Report (CSV)</button></div>
    </div>
    <div id="reportArea"></div>`;
  document.getElementById('genReport').addEventListener('click', async ()=>{
    const cls = document.getElementById('r_class').value.trim();
    const year = Number(document.getElementById('r_year_report').value);
    if(!cls) return alert('Enter class');
    const snap = await db.collection('students').where('cls','==',cls).get();
    if(snap.empty) return alert('No students in class');
    let csv = 'index,name,subject,score,term,year,teacher\\n';
    const promises = [];
    snap.forEach(sdoc=>{
      const s = sdoc.data();
      const p = db.collection('results').where('studentId','==',sdoc.id).where('year','==',year).get().then(rsnap=>{
        rsnap.forEach(rdoc=>{
          const r = rdoc.data();
          csv += `${s.index},"${s.name}",${r.subject},${r.score},${r.term},${r.year},${r.teacherId}\\n`;
        });
      });
      promises.push(p);
    });
    Promise.all(promises).then(()=> downloadText(csv, `report_${cls}_${year}.csv`));
  });
}

// util
function downloadText(text, filename){
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}