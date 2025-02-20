// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBRmoG1ABZwk34nujahqMneg88kCKRkG5g",
    authDomain: "notepad-c84b0.firebaseapp.com",
    projectId: "notepad-c84b0",
    storageBucket: "notepad-c84b0.firebasestorage.app",
    messagingSenderId: "624634204412",
    appId: "1:624634204412:web:d19c9b3b9e7e27a17a0779",
    measurementId: "G-1RSPRKK9FR"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Dom Elements
// Auth elements
const authContainer = document.getElementById('auth-container');
const editorContainer = document.getElementById('editor-container');
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');
const currentUserElement = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');

// Editor elements
const newFileBtn = document.getElementById('new-file-btn');
const documentList = document.getElementById('document-list');
const saveBtn = document.getElementById('save-btn');
const deleteBtn = document.getElementById('delete-btn');
const languageSelector = document.getElementById('language-selector');
const toggleThemeBtn = document.getElementById('toggle-theme-btn');
const filenameInput = document.getElementById('filename-input');
const editor = document.getElementById('editor');
const highlightedCode = document.getElementById('highlighted-code');
const lineNumbers = document.getElementById('line-numbers');
const cursorPosition = document.getElementById('cursor-position');
const documentInfo = document.getElementById('document-info');

// App State
let currentUser = null;
let currentDocument = null;
let documents = [];
let isDarkTheme = false;
let isDocumentModified = false;

// =====================
// Auth Module
// =====================
// Event Listeners for Auth
loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
});

signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    loginUser(email, password);
});

signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    
    if (password !== confirmPassword) {
        showAuthError('Passwords do not match.');
        return;
    }
    
    registerUser(email, password);
});

logoutBtn.addEventListener('click', () => {
    logoutUser();
});

// Auth Functions
function loginUser(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Clear form
            loginForm.reset();
            clearAuthError();
        })
        .catch((error) => {
            showAuthError(`Login failed: ${error.message}`);
        });
}

function registerUser(email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Create user document in Firestore
            createUserDocument(userCredential.user);
            // Clear form
            signupForm.reset();
            clearAuthError();
        })
        .catch((error) => {
            showAuthError(`Registration failed: ${error.message}`);
        });
}

function createUserDocument(user) {
    db.collection('users').doc(user.uid).set({
        email: user.email,
        userId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

function logoutUser() {
    auth.signOut()
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
}

function clearAuthError() {
    authError.textContent = '';
    authError.classList.add('hidden');
}

// =====================
// Documents Module
// =====================
// Event Listeners for Documents
newFileBtn.addEventListener('click', createNewDocument);
saveBtn.addEventListener('click', saveDocument);
deleteBtn.addEventListener('click', deleteDocument);
filenameInput.addEventListener('blur', updateDocumentName);

// Document Functions
function createNewDocument() {
    currentDocument = {
        id: null,
        name: 'Untitled Document',
        content: '',
        language: 'plaintext',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: currentUser.uid
    };
    
    loadDocumentIntoEditor(currentDocument);
    isDocumentModified = true;
    updateDocumentList();
}

function loadDocumentIntoEditor(doc) {
    currentDocument = doc;
    
    filenameInput.value = doc.name;
    editor.value = doc.content;
    languageSelector.value = doc.language;
    
    updateHighlighting();
    updateLineNumbers();
    updateDocumentInfo();
    
    // Update UI to show active document
    const docElements = documentList.querySelectorAll('.document-item');
    docElements.forEach(el => {
        if (el.dataset.id === doc.id) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    });
    
    isDocumentModified = false;
}

function saveDocument() {
    if (!currentDocument) return;
    
    const documentData = {
        name: filenameInput.value.trim() || 'Untitled Document',
        content: editor.value,
        language: languageSelector.value,
        updatedAt: new Date(),
        userId: currentUser.uid
    };
    
    if (!currentDocument.id) {
        // Create new document
        documentData.createdAt = new Date();
        db.collection('documents').add(documentData)
            .then(docRef => {
                currentDocument.id = docRef.id;
                showStatusMessage('Document created successfully');
                fetchUserDocuments();
            })
            .catch(error => {
                console.error('Error creating document:', error);
                showStatusMessage('Error creating document', true);
            });
    } else {
        // Update existing document
        db.collection('documents').doc(currentDocument.id).update(documentData)
            .then(() => {
                showStatusMessage('Document saved successfully');
                fetchUserDocuments();
            })
            .catch(error => {
                console.error('Error updating document:', error);
                showStatusMessage('Error saving document', true);
            });
    }
    
    isDocumentModified = false;
}

function deleteDocument() {
    if (!currentDocument || !currentDocument.id) return;
    
    if (confirm('Are you sure you want to delete this document?')) {
        db.collection('documents').doc(currentDocument.id).delete()
            .then(() => {
                showStatusMessage('Document deleted successfully');
                createNewDocument();
                fetchUserDocuments();
            })
            .catch(error => {
                console.error('Error deleting document:', error);
                showStatusMessage('Error deleting document', true);
            });
    }
}

function updateDocumentName() {
    if (currentDocument) {
        currentDocument.name = filenameInput.value.trim() || 'Untitled Document';
        isDocumentModified = true;
    }
}

function fetchUserDocuments() {
    if (!currentUser) return;
    
    db.collection('documents')
        .where('userId', '==', currentUser.uid)
        .orderBy('updatedAt', 'desc')
        .get()
        .then(querySnapshot => {
            documents = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                documents.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date()
                });
            });
            updateDocumentList();
        })
        .catch(error => {
            console.error('Error fetching documents:', error);
        });
}

function updateDocumentList() {
    documentList.innerHTML = '';
    
    if (documents.length === 0 && !currentDocument.id) {
        // If no documents, just show the current unsaved document
        const docElement = createDocumentElement(currentDocument);
        documentList.appendChild(docElement);
        return;
    }
    
    // Add current unsaved document to the top if it's new
    if (currentDocument && !currentDocument.id) {
        const docElement = createDocumentElement(currentDocument);
        documentList.appendChild(docElement);
    }
    
    // Add all saved documents
    documents.forEach(doc => {
        const docElement = createDocumentElement(doc);
        documentList.appendChild(docElement);
    });
}

function createDocumentElement(doc) {
    const docElement = document.createElement('div');
    docElement.className = 'document-item';
    if (currentDocument && doc.id === currentDocument.id) {
        docElement.classList.add('active');
    }
    docElement.dataset.id = doc.id;
    
    const nameElement = document.createElement('div');
    nameElement.className = 'document-item-name';
    nameElement.textContent = doc.name;
    
    const dateElement = document.createElement('div');
    dateElement.className = 'document-item-date';
    dateElement.textContent = formatDate(doc.updatedAt);
    
    docElement.appendChild(nameElement);
    docElement.appendChild(dateElement);
    
    docElement.addEventListener('click', () => {
        if (isDocumentModified) {
            if (confirm('You have unsaved changes. Save before switching documents?')) {
                saveDocument();
            }
        }
        
        if (doc.id) {
            // Load existing document
            loadDocumentIntoEditor(doc);
        } else {
            // Already the current document
            loadDocumentIntoEditor(currentDocument);
        }
    });
    
    return docElement;
}

function formatDate(date) {
    if (!(date instanceof Date)) {
        return '';
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function showStatusMessage(message, isError = false) {
    documentInfo.textContent = message;
    documentInfo.style.color = isError ? 'var(--error-color)' : 'var(--success-color)';
    
    setTimeout(() => {
        documentInfo.textContent = '';
    }, 3000);
}

// =====================
// Editor Module
// =====================
// Event Listeners for Editor
editor.addEventListener('input', () => {
    updateHighlighting();
    updateLineNumbers();
    isDocumentModified = true;
});

editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        
        // Insert 4 spaces (tab)
        editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
        
        // Move cursor position
        editor.selectionStart = editor.selectionEnd = start + 4;
        
        updateHighlighting();
        updateLineNumbers();
        isDocumentModified = true;
    } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveDocument();
    }
});

editor.addEventListener('scroll', (e) => {
    // Sync scroll position of highlighted code with editor
    highlightedCode.parentElement.scrollTop = editor.scrollTop;
    lineNumbers.scrollTop = editor.scrollTop;
});

editor.addEventListener('keyup', updateCursorPosition);
editor.addEventListener('click', updateCursorPosition);

languageSelector.addEventListener('change', () => {
    if (currentDocument) {
        currentDocument.language = languageSelector.value;
        updateHighlighting();
        isDocumentModified = true;
    }
});

toggleThemeBtn.addEventListener('click', toggleTheme);

// Editor Functions
function updateHighlighting() {
    // Get current language
    const language = languageSelector.value;
    const content = editor.value || '';
    
    // Set the content and class
    highlightedCode.textContent = content;
    highlightedCode.className = language;
    
    // Highlight the code
    hljs.highlightElement(highlightedCode);
}

function updateLineNumbers() {
    const content = editor.value;
    const lines = content.split('\n');
    const lineCount = lines.length;
    
    lineNumbers.innerHTML = '';
    
    for (let i = 0; i < lineCount; i++) {
        const lineNumberElement = document.createElement('div');
        lineNumberElement.className = 'line-number';
        lineNumberElement.textContent = i + 1;
        lineNumbers.appendChild(lineNumberElement);
    }
}

function updateCursorPosition() {
    const text = editor.value;
    const cursorPos = editor.selectionStart;
    
    // Count lines and columns
    let lineCount = 1;
    let colCount = 1;
    
    for (let i = 0; i < cursorPos; i++) {
        if (text[i] === '\n') {
            lineCount++;
            colCount = 1;
        } else {
            colCount++;
        }
    }
    
    cursorPosition.textContent = `Line: ${lineCount}, Column: ${colCount}`;
}

function updateDocumentInfo() {
    if (!currentDocument) return;
    
    const contentLength = editor.value.length;
    const lineCount = editor.value.split('\n').length;
    
    documentInfo.textContent = `${contentLength} characters, ${lineCount} lines`;
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    document.body.classList.toggle('dark-theme', isDarkTheme);
    
    // Update theme toggle button
    toggleThemeBtn.textContent = isDarkTheme ? '☀️' : '🌙';
}

// =====================
// Initialize App
// =====================
// Auth state change listener
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        currentUser = user;
        currentUserElement.textContent = user.email;
        
        // Show editor, hide auth
        authContainer.classList.add('hidden');
        editorContainer.classList.remove('hidden');
        
        // Load user documents
        fetchUserDocuments();
        
        // Create a new document if none exists
        if (documents.length === 0) {
            createNewDocument();
        }
    } else {
        // User is signed out
        currentUser = null;
        
        // Show auth, hide editor
        authContainer.classList.remove('hidden');
        editorContainer.classList.add('hidden');
        
        // Clear document list
        documentList.innerHTML = '';
    }
});

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        toggleTheme();
    }
    
    // Initialize highlight.js
    hljs.configure({ 
        languages: ['javascript', 'html', 'css', 'python', 'java', 'csharp', 'php'],
    });
    
    // Add real-time updates listener
    setupRealtimeUpdates();
});

// Set up real-time updates
function setupRealtimeUpdates() {
    db.collection('documents')
        .onSnapshot(snapshot => {
            let hasChanges = false;
            
            snapshot.docChanges().forEach(change => {
                const doc = change.doc;
                const data = doc.data();
                
                // Only process if it belongs to current user
                if (currentUser && data.userId === currentUser.uid) {
                    hasChanges = true;
                }
            });
            
            // Refresh documents list if changes detected
            if (hasChanges && currentUser) {
                fetchUserDocuments();
            }
        }, error => {
            console.error('Real-time updates error:', error);
        });
}

// Window beforeunload event
window.addEventListener('beforeunload', (e) => {
    if (isDocumentModified) {
        // Show confirmation dialog
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});