// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyAd30WuJc7FUU6ZeS3bWhbliByUzlovUqg",
    authDomain: "notepad-28eda.firebaseapp.com",
    projectId: "notepad-28eda",
    storageBucket: "notepad-28eda.firebasestorage.app",
    messagingSenderId: "718730129861",
    appId: "1:718730129861:web:a821c3f3f7a10957cfdbac",
    measurementId: "G-EBYK78PL0X"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authSection = document.getElementById('authSection');
const notesSection = document.getElementById('notesSection');
const authForm = document.getElementById('authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const newNoteBtn = document.getElementById('newNoteBtn');
const notesList = document.getElementById('notesList');
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const copyBtn = document.getElementById('copyBtn');
const deleteBtn = document.getElementById('deleteBtn');
const loadingSpinner = document.getElementById('loadingSpinner');

// State Management
let currentUser = null;
let currentNote = null;
let saveTimeout = null;

// Authentication Event Listeners
loginBtn.addEventListener('click', () => handleAuth('login'));
signupBtn.addEventListener('click', () => handleAuth('signup'));
logoutBtn.addEventListener('click', handleLogout);

// Note Event Listeners
newNoteBtn.addEventListener('click', createNewNote);
noteTitle.addEventListener('input', handleNoteChange);
noteContent.addEventListener('input', handleNoteChange);
copyBtn.addEventListener('click', copyNote);
deleteBtn.addEventListener('click', deleteNote);

// Authentication Functions
async function handleAuth(type) {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    showLoading(true);
    
    try {
        if (type === 'signup') {
            await auth.createUserWithEmailAndPassword(email, password);
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch (error) {
        alert(error.message);
        showLoading(false);
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        alert(error.message);
    }
}

// Firebase Auth State Observer
auth.onAuthStateChanged((user) => {
    showLoading(true);
    currentUser = user;
    
    if (user) {
        authSection.classList.add('hidden');
        notesSection.classList.remove('hidden');
        loadNotes();
    } else {
        authSection.classList.remove('hidden');
        notesSection.classList.add('hidden');
        clearEditor();
    }
    
    showLoading(false);
});

// Note Management Functions
async function loadNotes() {
    try {
        const snapshot = await db.collection('notes')
            .where('userId', '==', currentUser.uid)
            .orderBy('updatedAt', 'desc')
            .get();
        
        notesList.innerHTML = '';
        snapshot.forEach(doc => {
            const note = doc.data();
            addNoteToList(doc.id, note);
        });
    } catch (error) {
        console.error('Error loading notes:', error);
        alert('Error loading notes');
    }
}

function addNoteToList(id, note) {
    const div = document.createElement('div');
    div.className = 'note-item';
    div.textContent = note.title || 'Untitled Note';
    div.addEventListener('click', () => selectNote(id));
    
    if (currentNote && currentNote.id === id) {
        div.classList.add('active');
    }
    
    notesList.appendChild(div);
}

async function createNewNote() {
    const note = {
        userId: currentUser.uid,
        title: 'Untitled Note',
        content: '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        const docRef = await db.collection('notes').add(note);
        note.id = docRef.id;
        currentNote = note;
        loadNotes();
        updateEditor(note);
    } catch (error) {
        console.error('Error creating note:', error);
        alert('Error creating note');
    }
}

async function selectNote(id) {
    if (currentNote && currentNote.id === id) return;
    
    try {
        const doc = await db.collection('notes').doc(id).get();
        if (doc.exists) {
            currentNote = { id, ...doc.data() };
            updateEditor(currentNote);
            document.querySelectorAll('.note-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.classList.add('active');
        }
    } catch (error) {
        console.error('Error selecting note:', error);
        alert('Error selecting note');
    }
}

function handleNoteChange() {
    if (!currentNote) return;
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveNote, 1000);
    
    const noteItem = Array.from(notesList.children)
        .find(item => item.classList.contains('active'));
    if (noteItem) {
        noteItem.textContent = noteTitle.value || 'Untitled Note';
    }
}

async function saveNote() {
    if (!currentNote) return;
    
    const updates = {
        title: noteTitle.value.trim() || 'Untitled Note',
        content: noteContent.value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('notes').doc(currentNote.id).update(updates);
        Object.assign(currentNote, updates);
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Error saving note');
    }
}

async function deleteNote() {
    if (!currentNote || !confirm('Are you sure you want to delete this note?')) return;
    
    try {
        await db.collection('notes').doc(currentNote.id).delete();
        currentNote = null;
        clearEditor();
        loadNotes();
    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Error deleting note');
    }
}

async function copyNote() {
    if (!currentNote) return;
    
    const noteCopy = {
        userId: currentUser.uid,
        title: `${currentNote.title} (Copy)`,
        content: currentNote.content,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        const docRef = await db.collection('notes').add(noteCopy);
        noteCopy.id = docRef.id;
        currentNote = noteCopy;
        loadNotes();
        updateEditor(noteCopy);
    } catch (error) {
        console.error('Error copying note:', error);
        alert('Error copying note');
    }
}

// UI Helper Functions
function updateEditor(note) {
    noteTitle.value = note.title || '';
    noteContent.value = note.content || '';
    noteTitle.disabled = false;
    noteContent.disabled = false;
    copyBtn.disabled = false;
    deleteBtn.disabled = false;
}

function clearEditor() {
    noteTitle.value = '';
    noteContent.value = '';
    noteTitle.disabled = true;
    noteContent.disabled = true;
    copyBtn.disabled = true;
    deleteBtn.disabled = true;
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
    });
}

function showLoading(show) {
    loadingSpinner.classList.toggle('hidden', !show);
}

// Error Handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', error);
    alert('An unexpected error occurred. Please try again.');
    return false;
};