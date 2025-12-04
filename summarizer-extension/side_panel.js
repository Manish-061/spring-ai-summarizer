document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['researchNotes'], function (result) {
        if (result.researchNotes) {
            document.getElementById('notes').value = result.researchNotes;
        }
    });

    document.getElementById('summarizeBtn').addEventListener('click', summarizeText);
    document.getElementById('saveNotesBtn').addEventListener('click', saveNotes);
    document.getElementById('deleteNotesBtn').addEventListener('click', deleteNotes);
    document.getElementById('cancelDeleteBtn').addEventListener('click', hideDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDeleteNotes);
});


async function summarizeText() {
    const btn = document.getElementById('summarizeBtn');
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    const resultsDiv = document.getElementById('results');

    try {
        // Reset UI
        resultsDiv.innerHTML = '';
        btn.disabled = true;
        btnText.textContent = 'Summarizing...';
        loader.style.display = 'inline-block';

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString()
        });

        if (!result) {
            showStatus('Please select some text first', 'error');
            return;
        }

        const response = await fetch('http://localhost:8080/api/research/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: result, operation: 'summarize' })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const text = await response.text();
        showResult(formatText(text));
        showStatus('Summary generated successfully', 'success');

    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Summarize Selection';
        loader.style.display = 'none';
    }
}


async function saveNotes() {
    const notes = document.getElementById('notes').value;
    const btn = document.getElementById('saveNotesBtn');

    // Visual feedback on button
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    chrome.storage.local.set({ 'researchNotes': notes }, function () {
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            showStatus('Notes saved successfully', 'success');
        }, 500);
    });
}

function deleteNotes() {
    document.getElementById('deleteModal').classList.add('show');
}

function hideDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
}

function confirmDeleteNotes() {
    const btn = document.getElementById('confirmDeleteBtn');
    const originalText = btn.textContent;

    btn.textContent = 'Deleting...';
    btn.disabled = true;

    chrome.storage.local.remove(['researchNotes'], function () {
        document.getElementById('notes').value = '';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
            hideDeleteModal();
            showStatus('Notes deleted successfully', 'success');
        }, 500);
    });
}


function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\s*[\*\-]\s/gm, '• ')
        .replace(/\n/g, '<br>');
}


function showResult(content) {
    const resultsDiv = document.getElementById('results');
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    resultItem.innerHTML = `<div class="result-content">${content}</div>`;
    resultsDiv.appendChild(resultItem);
}

function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type} show`;

    setTimeout(() => {
        statusEl.classList.remove('show');
    }, 3000);
}