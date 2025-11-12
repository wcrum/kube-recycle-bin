const API_BASE = '/api/v1';

let currentRestoreName = null;
let currentDeletePolicyName = null;
let currentPage = 'items';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    // Show refresh button initially
    document.getElementById('refreshBtn').style.display = 'inline-flex';
    loadRecycleItems();
    
    // Setup refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        if (currentPage === 'items') {
            loadRecycleItems();
        } else if (currentPage === 'policies') {
            loadRecyclePolicies();
        }
    });
    
    // Setup theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Setup modal close handlers
    document.getElementById('closeYamlModal').addEventListener('click', closeYamlModal);
    document.getElementById('closeYamlBtn').addEventListener('click', closeYamlModal);
    document.getElementById('closeRestoreModal').addEventListener('click', closeRestoreModal);
    document.getElementById('cancelRestoreBtn').addEventListener('click', closeRestoreModal);
    
    // Setup policy modals
    document.getElementById('createPolicyBtn').addEventListener('click', showCreatePolicyModal);
    document.getElementById('closeCreatePolicyModal').addEventListener('click', closeCreatePolicyModal);
    document.getElementById('cancelCreatePolicyBtn').addEventListener('click', closeCreatePolicyModal);
    document.getElementById('submitCreatePolicyBtn').addEventListener('click', submitCreatePolicy);
    document.getElementById('closeDeletePolicyModal').addEventListener('click', closeDeletePolicyModal);
    document.getElementById('cancelDeletePolicyBtn').addEventListener('click', closeDeletePolicyModal);
    document.getElementById('confirmDeletePolicyBtn').addEventListener('click', confirmDeletePolicy);
    
    // Setup copy button
    document.getElementById('copyYamlBtn').addEventListener('click', copyYAML);
    
    // Setup restore confirmation
    document.getElementById('confirmRestoreBtn').addEventListener('click', confirmRestore);
    
    // Setup form submission
    document.getElementById('createPolicyForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitCreatePolicy();
    });
    
    // Close modals on outside click
    window.addEventListener('click', (e) => {
        const yamlModal = document.getElementById('yamlModal');
        const restoreModal = document.getElementById('restoreModal');
        const createPolicyModal = document.getElementById('createPolicyModal');
        const deletePolicyModal = document.getElementById('deletePolicyModal');
        if (e.target.classList.contains('modal-overlay')) {
            closeYamlModal();
            closeRestoreModal();
            closeCreatePolicyModal();
            closeDeletePolicyModal();
        }
    });
});

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.className = savedTheme === 'dark' ? 'dark-theme' : 'light-theme';
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.className = newTheme === 'dark' ? 'dark-theme' : 'light-theme';
    localStorage.setItem('theme', newTheme);
}

// Ripple effect for buttons
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = button.querySelector('.mdc-button__ripple');
    if (!ripple) return;
    
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    ripple.classList.add('ripple');
    setTimeout(() => ripple.classList.remove('ripple'), 600);
}

document.addEventListener('click', (e) => {
    if (e.target.closest('.mdc-button')) {
        createRipple(e);
    }
});

async function loadRecycleItems() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const content = document.getElementById('content');
    const tableBody = document.getElementById('itemsTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableCard = document.querySelector('.table-card');
    
    loading.style.display = 'flex';
    error.style.display = 'none';
    content.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/recycle-items`);
        if (!response.ok) {
            throw new Error(`Failed to load recycle items: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        loading.style.display = 'none';
        
        if (data.items.length === 0) {
            emptyState.style.display = 'block';
            if (tableCard) tableCard.style.display = 'none';
            content.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        if (tableCard) tableCard.style.display = 'block';
        tableBody.innerHTML = '';
        
        data.items.forEach(item => {
            const row = createTableRow(item);
            tableBody.appendChild(row);
        });
        
        content.style.display = 'block';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
        console.error('Error loading recycle items:', err);
    }
}

function createTableRow(item) {
    const row = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.textContent = item.name;
    
    const keyCell = document.createElement('td');
    keyCell.textContent = item.objectKey;
    
    const apiVersionCell = document.createElement('td');
    apiVersionCell.textContent = item.objectAPIVersion;
    
    const kindCell = document.createElement('td');
    kindCell.textContent = item.objectKind;
    
    const namespaceCell = document.createElement('td');
    namespaceCell.textContent = item.objectNamespace || '(cluster)';
    
    const ageCell = document.createElement('td');
    ageCell.textContent = formatAge(item.age);
    
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions';
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'mdc-button mdc-button--outlined';
    viewBtn.innerHTML = '<span class="mdc-button__ripple"></span><span class="mdc-button__label">View YAML</span>';
    viewBtn.addEventListener('click', () => viewYAML(item.name));
    
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'mdc-button mdc-button--raised';
    restoreBtn.style.background = 'var(--success)';
    restoreBtn.style.color = 'white';
    restoreBtn.innerHTML = '<span class="mdc-button__ripple"></span><span class="mdc-button__label">Restore</span>';
    restoreBtn.addEventListener('click', () => showRestoreModal(item.name));
    
    actionsCell.appendChild(viewBtn);
    actionsCell.appendChild(restoreBtn);
    
    row.appendChild(nameCell);
    row.appendChild(keyCell);
    row.appendChild(apiVersionCell);
    row.appendChild(kindCell);
    row.appendChild(namespaceCell);
    row.appendChild(ageCell);
    row.appendChild(actionsCell);
    
    return row;
}

function formatAge(ageString) {
    const match = ageString.match(/(\d+h)?(\d+m)?(\d+s)?/);
    if (!match) return ageString;
    
    const parts = [];
    if (match[1]) parts.push(match[1].replace('h', 'h'));
    if (match[2]) parts.push(match[2].replace('m', 'm'));
    if (match[3]) parts.push(match[3].replace('s', 's'));
    
    return parts.join(' ') || ageString;
}

async function viewYAML(name) {
    const modal = document.getElementById('yamlModal');
    const content = document.getElementById('yamlContent');
    const codeElement = content.querySelector('code') || content;
    
    codeElement.textContent = 'Loading...';
    modal.style.display = 'flex';
    
    try {
        const response = await fetch(`${API_BASE}/recycle-items/${name}?format=yaml`);
        if (!response.ok) {
            throw new Error(`Failed to load YAML: ${response.statusText}`);
        }
        
        const yaml = await response.text();
        codeElement.textContent = yaml;
        highlightYAML(codeElement);
    } catch (err) {
        codeElement.textContent = `Error: ${err.message}`;
        console.error('Error loading YAML:', err);
    }
}

function highlightYAML(element) {
    const text = element.textContent;
    const lines = text.split('\n');
    let highlighted = '';
    
    lines.forEach(line => {
        if (line.trim().startsWith('#')) {
            highlighted += `<span class="hl-comment">${escapeHtml(line)}</span>\n`;
        } else {
            const parts = line.split(/(:\s*)(.+)$/);
            if (parts.length >= 2) {
                highlighted += escapeHtml(parts[0]);
                highlighted += `<span class="hl-key">${escapeHtml(parts[1])}</span>`;
                if (parts[2]) {
                    const value = parts[2].trim();
                    if (value.startsWith('"') || value.startsWith("'")) {
                        highlighted += `<span class="hl-string">${escapeHtml(parts[2])}</span>`;
                    } else if (!isNaN(value) && value !== '') {
                        highlighted += `<span class="hl-number">${escapeHtml(parts[2])}</span>`;
                    } else if (value === 'true' || value === 'false' || value === 'null') {
                        highlighted += `<span class="hl-boolean">${escapeHtml(parts[2])}</span>`;
                    } else {
                        highlighted += escapeHtml(parts[2]);
                    }
                }
                highlighted += '\n';
            } else {
                highlighted += escapeHtml(line) + '\n';
            }
        }
    });
    
    element.innerHTML = highlighted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function closeYamlModal() {
    document.getElementById('yamlModal').style.display = 'none';
}

function showRestoreModal(name) {
    currentRestoreName = name;
    document.getElementById('restoreItemName').textContent = name;
    document.getElementById('restoreModal').style.display = 'flex';
}

function closeRestoreModal() {
    document.getElementById('restoreModal').style.display = 'none';
    currentRestoreName = null;
}

async function confirmRestore() {
    if (!currentRestoreName) return;
    
    const confirmBtn = document.getElementById('confirmRestoreBtn');
    const originalText = confirmBtn.querySelector('.mdc-button__label').textContent;
    const label = confirmBtn.querySelector('.mdc-button__label');
    confirmBtn.disabled = true;
    label.textContent = 'Restoring...';
    
    try {
        const response = await fetch(`${API_BASE}/recycle-items/${currentRestoreName}/restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to restore: ${errorData}`);
        }
        
        const data = await response.json();
        showNotification(`Success: ${data.message}`, 'success');
        
        closeRestoreModal();
        loadRecycleItems();
    } catch (err) {
        showNotification(`Error: ${err.message}`, 'error');
        console.error('Error restoring item:', err);
    } finally {
        confirmBtn.disabled = false;
        label.textContent = originalText;
    }
}

async function copyYAML() {
    const codeElement = document.querySelector('#yamlContent code');
    const content = codeElement ? codeElement.textContent : document.getElementById('yamlContent').textContent;
    
    try {
        await navigator.clipboard.writeText(content);
        const btn = document.getElementById('copyYamlBtn');
        const label = btn.querySelector('.mdc-button__label');
        const originalText = label.textContent;
        label.textContent = 'Copied!';
        setTimeout(() => {
            label.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy to clipboard', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        border-radius: 4px;
        background: var(--surface);
        color: var(--on-surface);
        box-shadow: var(--elevation-3);
        z-index: 2000;
        animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'error') {
        notification.style.borderLeft = '4px solid var(--error)';
    } else if (type === 'success') {
        notification.style.borderLeft = '4px solid var(--success)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Navigation
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            switchPage(page);
        });
    });
}

function switchPage(page) {
    currentPage = page;
    
    // Update navigation buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        if (btn.getAttribute('data-page') === page) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show/hide pages
    document.getElementById('pageItems').style.display = page === 'items' ? 'block' : 'none';
    document.getElementById('pagePolicies').style.display = page === 'policies' ? 'block' : 'none';
    
    // Show refresh button (available on both pages)
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.style.display = 'inline-flex';
    
    // Load data for the selected page
    if (page === 'items') {
        loadRecycleItems();
    } else if (page === 'policies') {
        loadRecyclePolicies();
    }
}

// Recycle Policies
async function loadRecyclePolicies() {
    const loading = document.getElementById('policiesLoading');
    const error = document.getElementById('policiesError');
    const content = document.getElementById('policiesContent');
    const tableBody = document.getElementById('policiesTableBody');
    const emptyState = document.getElementById('policiesEmptyState');
    const table = document.getElementById('policiesTable');
    
    loading.style.display = 'flex';
    error.style.display = 'none';
    content.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE}/recycle-policies`);
        if (!response.ok) {
            throw new Error(`Failed to load recycle policies: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        loading.style.display = 'none';
        
        if (data.policies.length === 0) {
            emptyState.style.display = 'block';
            table.style.display = 'none';
            content.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        table.style.display = 'table';
        tableBody.innerHTML = '';
        
        data.policies.forEach(policy => {
            const row = createPolicyTableRow(policy);
            tableBody.appendChild(row);
        });
        
        content.style.display = 'block';
    } catch (err) {
        loading.style.display = 'none';
        error.textContent = `Error: ${err.message}`;
        error.style.display = 'block';
        console.error('Error loading recycle policies:', err);
    }
}

function createPolicyTableRow(policy) {
    const row = document.createElement('tr');
    
    const nameCell = document.createElement('td');
    nameCell.textContent = policy.name;
    
    const groupCell = document.createElement('td');
    groupCell.textContent = policy.group || '(core)';
    
    const resourceCell = document.createElement('td');
    resourceCell.textContent = policy.resource;
    
    const namespacesCell = document.createElement('td');
    if (policy.namespaces && policy.namespaces.length > 0) {
        namespacesCell.textContent = policy.namespaces.join(', ');
    } else {
        namespacesCell.textContent = '(all namespaces)';
    }
    
    const ageCell = document.createElement('td');
    ageCell.textContent = formatAge(policy.age);
    
    const actionsCell = document.createElement('td');
    actionsCell.className = 'actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'mdc-button mdc-button--outlined';
    deleteBtn.style.borderColor = 'var(--error)';
    deleteBtn.style.color = 'var(--error)';
    deleteBtn.innerHTML = '<span class="mdc-button__ripple"></span><span class="mdc-button__label">Delete</span>';
    deleteBtn.addEventListener('click', () => showDeletePolicyModal(policy.name));
    
    actionsCell.appendChild(deleteBtn);
    
    row.appendChild(nameCell);
    row.appendChild(groupCell);
    row.appendChild(resourceCell);
    row.appendChild(namespacesCell);
    row.appendChild(ageCell);
    row.appendChild(actionsCell);
    
    return row;
}

function showCreatePolicyModal() {
    document.getElementById('createPolicyModal').style.display = 'flex';
    document.getElementById('createPolicyForm').reset();
}

function closeCreatePolicyModal() {
    document.getElementById('createPolicyModal').style.display = 'none';
    document.getElementById('createPolicyForm').reset();
}

async function submitCreatePolicy() {
    const form = document.getElementById('createPolicyForm');
    const formData = new FormData(form);
    
    const namespacesText = formData.get('namespaces') || '';
    const namespaces = namespacesText
        .split('\n')
        .map(ns => ns.trim())
        .filter(ns => ns.length > 0);
    
    const policyData = {
        name: formData.get('name'),
        group: formData.get('group') || '',
        resource: formData.get('resource'),
        namespaces: namespaces,
    };
    
    const submitBtn = document.getElementById('submitCreatePolicyBtn');
    const label = submitBtn.querySelector('.mdc-button__label');
    const originalText = label.textContent;
    submitBtn.disabled = true;
    label.textContent = 'Creating...';
    
    try {
        const response = await fetch(`${API_BASE}/recycle-policies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(policyData),
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to create policy: ${errorData}`);
        }
        
        const data = await response.json();
        showNotification(`Success: ${data.message}`, 'success');
        
        closeCreatePolicyModal();
        loadRecyclePolicies();
    } catch (err) {
        showNotification(`Error: ${err.message}`, 'error');
        console.error('Error creating policy:', err);
    } finally {
        submitBtn.disabled = false;
        label.textContent = originalText;
    }
}

function showDeletePolicyModal(name) {
    currentDeletePolicyName = name;
    document.getElementById('deletePolicyName').textContent = name;
    document.getElementById('deletePolicyModal').style.display = 'flex';
}

function closeDeletePolicyModal() {
    document.getElementById('deletePolicyModal').style.display = 'none';
    currentDeletePolicyName = null;
}

async function confirmDeletePolicy() {
    if (!currentDeletePolicyName) return;
    
    const confirmBtn = document.getElementById('confirmDeletePolicyBtn');
    const originalText = confirmBtn.querySelector('.mdc-button__label').textContent;
    const label = confirmBtn.querySelector('.mdc-button__label');
    confirmBtn.disabled = true;
    label.textContent = 'Deleting...';
    
    try {
        const response = await fetch(`${API_BASE}/recycle-policies/${currentDeletePolicyName}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Failed to delete policy: ${errorData}`);
        }
        
        const data = await response.json();
        showNotification(`Success: ${data.message}`, 'success');
        
        closeDeletePolicyModal();
        loadRecyclePolicies();
    } catch (err) {
        showNotification(`Error: ${err.message}`, 'error');
        console.error('Error deleting policy:', err);
    } finally {
        confirmBtn.disabled = false;
        label.textContent = originalText;
    }
}
