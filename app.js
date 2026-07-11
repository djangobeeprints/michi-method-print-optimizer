// State Management
let queue = [];
let selectedSize = {
    cols: 1,
    rows: 1,
    label: '1x1',
    w_in: 2.75,
    h_in: 3.75,
    colorClass: 'size-pink'
};
let loadedImage = null; // Image element currently loaded
let imageName = 'image';
let scale = 1.0;
let pan = { x: 0, y: 0 };
let currentHole = { x: 0, y: 0, w: 0, h: 0 };
let pages = []; // Result of bin packing

// DOM Elements
const themeToggle = document.getElementById('theme-toggle');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const localGallery = document.getElementById('local-gallery');

// Interactive Size Grid Elements
const interactiveGrid = document.getElementById('interactive-grid');
const gridCells = document.querySelectorAll('.grid-cell');
const readoutName = document.getElementById('readout-name');
const readoutDims = document.getElementById('readout-dims');

// Workspace panels
const cropperWorkspace = document.getElementById('cropper-workspace');
const cropHelpBanner = document.getElementById('crop-help-banner');
const cropContainer = document.getElementById('crop-container');
const cropPlaceholderMsg = document.getElementById('crop-placeholder-msg');
const cropImage = document.getElementById('crop-image');
const cropOverlayWrapper = document.getElementById('crop-overlay-wrapper');
const cropperControls = document.getElementById('cropper-controls');
const zoomSlider = document.getElementById('zoom-slider');
const rotateCropBtn = document.getElementById('rotate-crop-btn');
const resetCropBtn = document.getElementById('reset-crop-btn');
const cancelCropBtn = document.getElementById('cancel-crop-btn');
const queueFormRow = document.getElementById('queue-form-row');
const quantityInput = document.getElementById('quantity-input');
const stepperMinus = document.querySelector('.minus-btn');
const stepperPlus = document.querySelector('.plus-btn');
const addToQueueBtn = document.getElementById('add-to-queue-btn');

// Print config panel
const paperSizeSelect = document.getElementById('paper-size-select');
const marginSlider = document.getElementById('margin-slider');
const marginVal = document.getElementById('margin-val');
const spacingSlider = document.getElementById('spacing-slider');
const spacingVal = document.getElementById('spacing-val');
const autoRotateCheckbox = document.getElementById('auto-rotate-checkbox');
const cutMarksCheckbox = document.getElementById('cut-marks-checkbox');

// Review Queue List Panels
const queueBadge = document.getElementById('queue-badge');
const queueEmpty = document.getElementById('queue-empty');
const queueItems = document.getElementById('queue-items');
const queueActions = document.getElementById('queue-actions');
const clearQueueBtn = document.getElementById('clear-queue-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');

const viewGuideBtn = document.getElementById('view-guide-btn');
const guideModal = document.getElementById('guide-modal');
const modalClose = document.querySelector('.modal-close');

// Initialize the Application
function init() {
    setupThemeToggle();
    setupDropZone();
    setupInteractiveGrid();
    setupCropperControls();
    setupStepper();
    setupSettingsListeners();
    setupQueueActions();
    setupModal();
    loadLocalFiles();
    
    // Select the first grid card (1x1) by default
    triggerGridSelect(1, 1);
    
    // Start in the placeholder state
    showEditorPlaceholder();
}

// Editor Empty State Toggles
function showEditorPlaceholder() {
    loadedImage = null;
    cropImage.src = '';
    cropImage.classList.add('hidden');
    cropOverlayWrapper.classList.add('hidden');
    cropOverlayWrapper.innerHTML = '';
    
    cropPlaceholderMsg.classList.remove('hidden');
    cropHelpBanner.classList.add('hidden');
    cropperControls.classList.add('hidden');
    queueFormRow.classList.add('hidden');
    
    document.querySelectorAll('.gallery-item').forEach(el => el.classList.remove('selected'));
    
    hideWarningToast();
}

function hideEditorPlaceholder() {
    cropPlaceholderMsg.classList.add('hidden');
    cropImage.classList.remove('hidden');
    cropOverlayWrapper.classList.remove('hidden');
    
    cropHelpBanner.classList.remove('hidden');
    cropperControls.classList.remove('hidden');
    queueFormRow.classList.remove('hidden');
}

// Dimension Fitting Validation
function checkDimensionsFit() {
    const paperSize = paperSizeSelect.value;
    let paperW = 8.5;
    let paperH = 11.0;
    
    if (paperSize === 'legal') {
        paperW = 8.5;
        paperH = 14.0;
    } else if (paperSize === 'a4') {
        paperW = 8.27;
        paperH = 11.69;
    }
    
    const cardW = selectedSize.w_in;
    const cardH = selectedSize.h_in;
    
    // Check if card fits within the paper dimensions in either normal or rotated layouts
    const fitsNormal = (cardW <= paperW && cardH <= paperH);
    const fitsRotated = (cardH <= paperW && cardW <= paperH);
    
    if (!fitsNormal && !fitsRotated) {
        showWarningToast();
        // Disable Add to Queue button
        addToQueueBtn.classList.add('disabled');
        addToQueueBtn.disabled = true;
        addToQueueBtn.title = "won't fit on regular paper!";
    } else {
        hideWarningToast();
        // Restore Add to Queue button if an image is loaded
        if (loadedImage) {
            addToQueueBtn.classList.remove('disabled');
            addToQueueBtn.disabled = false;
            addToQueueBtn.title = "";
        }
    }
}

let toastTimeout = null;
function showWarningToast() {
    const toast = document.getElementById('warning-toast');
    if (!toast) return;
    toast.classList.add('show');
    
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function hideWarningToast() {
    const toast = document.getElementById('warning-toast');
    if (!toast) return;
    toast.classList.remove('show');
}

// 1. Theme Toggle
function setupThemeToggle() {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('light-mode')) {
            icon.className = 'fa-solid fa-moon';
        } else {
            icon.className = 'fa-solid fa-sun';
        }
    });
}

// 2. Load Workspace Images Gallery
async function loadLocalFiles() {
    try {
        const response = await fetch('.');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const imageFiles = links
            .map(link => link.getAttribute('href'))
            .filter(href => href && 
                            imageExtensions.some(ext => href.toLowerCase().endsWith(ext)) && 
                            href !== 'mioche method.png' &&
                            !href.startsWith('.'));
        
        if (imageFiles.length > 0) {
            renderLocalGallery(imageFiles);
        } else {
            throw new Error("No image files found in listing");
        }
    } catch (err) {
        console.warn("Could not list local files via server. Using fallback hardcoded list.", err);
        const fallbackImages = [
            "1637.jpg", "1641.jpg", "1644.jpg", "1647.jpg", "1909.jpg",
            "1910.jpg", "1911.jpg", "1912.jpg", "1913.jpg", "1914.jpg",
            "1915.jpg", "1921.jpg", "1925.jpg", "1926.jpg", "1927.jpg",
            "1928.jpg", "1929.jpg", "1930.jpg", "1932.png", "1933.png",
            "1934.jpg", "1936.jpg", "2071.webp", "2072.jpg"
        ];
        renderLocalGallery(fallbackImages);
    }
}

function renderLocalGallery(files) {
    localGallery.innerHTML = '';
    
    files.forEach(filename => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.title = filename;
        
        const img = document.createElement('img');
        img.src = filename;
        img.alt = filename;
        img.loading = 'lazy';
        
        item.appendChild(img);
        
        item.addEventListener('click', () => {
            document.querySelectorAll('.gallery-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            imageName = filename.split('/').pop().split('.').shift();
            loadNewImage(filename);
        });
        
        localGallery.appendChild(item);
    });
}

// 3. Drop Zone Handlers
function setupDropZone() {
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleUploadedFile(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleUploadedFile(e.target.files[0]);
        }
    });
}

function handleUploadedFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please drop an image file.');
        return;
    }
    
    document.querySelectorAll('.gallery-item').forEach(el => el.classList.remove('selected'));
    imageName = file.name.split('.').shift();
    
    const reader = new FileReader();
    reader.onload = (e) => {
        loadNewImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

// 4. Load & Setup Image in Cropper Workspace
function loadNewImage(src) {
    loadedImage = new Image();
    loadedImage.onload = () => {
        cropImage.src = src;
        
        // Setup visual elements inside crop board
        hideEditorPlaceholder();
        
        setTimeout(() => {
            adjustCropOverlay();
            resetCrop();
            checkDimensionsFit();
        }, 50);
    };
    loadedImage.src = src;
}

// 5. Visual Interactive 4x3 Grid Selector Handlers
function setupInteractiveGrid() {
    gridCells.forEach(cell => {
        const col = parseInt(cell.dataset.col);
        const row = parseInt(cell.dataset.row);
        
        cell.addEventListener('mouseenter', () => {
            interactiveGrid.classList.remove('hovering-pink', 'hovering-blue', 'hovering-yellow');
            if (row === 1) interactiveGrid.classList.add('hovering-pink');
            else if (row === 2) interactiveGrid.classList.add('hovering-blue');
            else if (row === 3) interactiveGrid.classList.add('hovering-yellow');
            
            gridCells.forEach(c => {
                const cc = parseInt(c.dataset.col);
                const cr = parseInt(c.dataset.row);
                if (cc <= col && cr <= row) {
                    c.classList.add('hovered');
                } else {
                    c.classList.remove('hovered');
                }
            });
            
            updateReadoutText(col, row);
        });
        
        cell.addEventListener('click', () => {
            triggerGridSelect(col, row);
            
            if (loadedImage) {
                adjustCropOverlay();
                resetCrop();
            }
        });
    });
    
    interactiveGrid.addEventListener('mouseleave', () => {
        interactiveGrid.classList.remove('hovering-pink', 'hovering-blue', 'hovering-yellow');
        gridCells.forEach(c => c.classList.remove('hovered'));
        updateReadoutText(selectedSize.cols, selectedSize.rows);
    });
}

function triggerGridSelect(col, row) {
    selectedSize.cols = col;
    selectedSize.rows = row;
    selectedSize.label = `${col}x${row}`;
    selectedSize.w_in = col * 2.75;
    selectedSize.h_in = row * 3.75;
    
    interactiveGrid.className = 'interactive-grid';
    if (row === 1) {
        selectedSize.colorClass = 'size-pink';
        interactiveGrid.classList.add('selected-pink');
    } else if (row === 2) {
        selectedSize.colorClass = 'size-blue';
        interactiveGrid.classList.add('selected-blue');
    } else if (row === 3) {
        selectedSize.colorClass = 'size-yellow';
        interactiveGrid.classList.add('selected-yellow');
    }
    
    gridCells.forEach(c => {
        const cc = parseInt(c.dataset.col);
        const cr = parseInt(c.dataset.row);
        if (cc <= col && cr <= row) {
            c.classList.add('selected');
        } else {
            c.classList.remove('selected');
        }
    });
    
    updateReadoutText(col, row);
    checkDimensionsFit();
}

function updateReadoutText(col, row) {
    let name = '';
    let textClass = '';
    if (row === 1) {
        name = `${col}x${row} Horizontal Slot`;
        textClass = 'size-pink-text';
    } else if (row === 2) {
        name = `${col}x${row} Medium Slot`;
        textClass = 'size-blue-text';
    } else if (row === 3) {
        name = `${col}x${row} Tall Slot`;
        textClass = 'size-yellow-text';
    }
    
    const w = col * 2.75;
    const h = row * 3.75;
    const wCm = col * 7;
    const hCm = row * 9.5;
    
    readoutName.className = 'readout-name ' + textClass;
    readoutName.textContent = name;
    readoutDims.textContent = `${w.toFixed(2)}" x ${h.toFixed(2)}" (${wCm} x ${hCm.toFixed(1)} cm)`;
}

// Adjust the crop overlay cutout to match the selected aspect ratio
function adjustCropOverlay() {
    if (!loadedImage) return;
    
    const cw = cropContainer.clientWidth;
    const ch = cropContainer.clientHeight;
    const aspect = selectedSize.w_in / selectedSize.h_in;
    
    const maxW = cw - 40;
    const maxH = ch - 40;
    
    let hw, hh;
    if (maxW / maxH > aspect) {
        hh = maxH;
        hw = maxH * aspect;
    } else {
        hw = maxW;
        hh = maxW / aspect;
    }
    
    currentHole = {
        x: (cw - hw) / 2,
        y: (ch - hh) / 2,
        w: hw,
        h: hh
    };
    
    cropOverlayWrapper.innerHTML = `
        <svg width="100%" height="100%" style="position: absolute; top:0; left:0;">
            <defs>
                <mask id="crop-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect x="${currentHole.x}" y="${currentHole.y}" width="${currentHole.w}" height="${currentHole.h}" rx="6" ry="6" fill="black" />
                </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(5, 7, 12, 0.75)" mask="url(#crop-mask)" />
            <rect x="${currentHole.x}" y="${currentHole.y}" width="${currentHole.w}" height="${currentHole.h}" rx="6" ry="6" fill="none" stroke="var(--accent-color)" stroke-width="2" stroke-dasharray="6,4" />
            <path d="M ${currentHole.x} ${currentHole.y + 15} L ${currentHole.x} ${currentHole.y} L ${currentHole.x + 15} ${currentHole.y}" fill="none" stroke="var(--text-primary)" stroke-width="3" />
            <path d="M ${currentHole.x + currentHole.w - 15} ${currentHole.y} L ${currentHole.x + currentHole.w} ${currentHole.y} L ${currentHole.x + currentHole.w} ${currentHole.y + 15}" fill="none" stroke="var(--text-primary)" stroke-width="3" />
            <path d="M ${currentHole.x} ${currentHole.y + currentHole.h - 15} L ${currentHole.x} ${currentHole.y + currentHole.h} L ${currentHole.x + 15} ${currentHole.y + currentHole.h}" fill="none" stroke="var(--text-primary)" stroke-width="3" />
            <path d="M ${currentHole.x + currentHole.w - 15} ${currentHole.y + currentHole.h} L ${currentHole.x + currentHole.w} ${currentHole.y + currentHole.h} L ${currentHole.x + currentHole.w} ${currentHole.y + currentHole.h - 15}" fill="none" stroke="var(--text-primary)" stroke-width="3" />
        </svg>
    `;
}

// 6. Cropper Zoom and Panning Logic
function setupCropperControls() {
    zoomSlider.addEventListener('input', (e) => {
        scale = parseFloat(e.target.value);
        clampPan();
        updateImageTransform();
    });
    
    cropContainer.addEventListener('wheel', (e) => {
        if (!loadedImage) return;
        e.preventDefault();
        
        const zoomSpeed = 0.05;
        if (e.deltaY < 0) {
            scale = Math.min(parseFloat(zoomSlider.max), scale + zoomSpeed);
        } else {
            scale = Math.max(parseFloat(zoomSlider.min), scale - zoomSpeed);
        }
        
        zoomSlider.value = scale;
        clampPan();
        updateImageTransform();
    }, { passive: false });
    
    rotateCropBtn.addEventListener('click', () => {
        const temp = selectedSize.w_in;
        selectedSize.w_in = selectedSize.h_in;
        selectedSize.h_in = temp;
        
        adjustCropOverlay();
        resetCrop();
        checkDimensionsFit();
    });
    
    resetCropBtn.addEventListener('click', resetCrop);
    
    // Wire Cancel Button (Clear Editor)
    cancelCropBtn.addEventListener('click', showEditorPlaceholder);
    
    // Mouse Drag Listeners
    let isDragging = false;
    let startPan = { x: 0, y: 0 };
    let startMouse = { x: 0, y: 0 };
    
    cropContainer.addEventListener('mousedown', (e) => {
        if (!loadedImage) return;
        isDragging = true;
        startPan = { ...pan };
        startMouse = { x: e.clientX, y: e.clientY };
        cropContainer.style.cursor = 'grabbing';
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startMouse.x;
        const dy = e.clientY - startMouse.y;
        pan.x = startPan.x + dx;
        pan.y = startPan.y + dy;
        clampPan();
        updateImageTransform();
    });
    
    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            cropContainer.style.cursor = 'move';
        }
    });
    
    // Touch Drag & Pinch-Zoom Listeners
    let isPinching = false;
    let pinchStartDist = 0;
    let pinchStartScale = 1;

    function touchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    cropContainer.addEventListener('touchstart', (e) => {
        if (!loadedImage) return;

        if (e.touches.length === 2) {
            isDragging = false;
            isPinching = true;
            pinchStartDist = touchDistance(e.touches);
            pinchStartScale = scale;
        } else if (e.touches.length === 1) {
            isPinching = false;
            isDragging = true;
            startPan = { ...pan };
            startMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!loadedImage) return;

        if (isPinching && e.touches.length === 2) {
            e.preventDefault();
            const dist = touchDistance(e.touches);
            const ratio = dist / pinchStartDist;
            const minScale = parseFloat(zoomSlider.min);
            const maxScale = parseFloat(zoomSlider.max);
            scale = Math.max(minScale, Math.min(maxScale, pinchStartScale * ratio));
            zoomSlider.value = scale;
            clampPan();
            updateImageTransform();
        } else if (isDragging && e.touches.length === 1) {
            e.preventDefault();
            const dx = e.touches[0].clientX - startMouse.x;
            const dy = e.touches[0].clientY - startMouse.y;
            pan.x = startPan.x + dx;
            pan.y = startPan.y + dy;
            clampPan();
            updateImageTransform();
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            isDragging = false;
            isPinching = false;
        } else if (e.touches.length === 1) {
            // Transition from pinch back to single-finger pan
            isPinching = false;
            isDragging = true;
            startPan = { ...pan };
            startMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
}

function resetCrop() {
    if (!loadedImage) return;
    
    const minScaleX = currentHole.w / loadedImage.naturalWidth;
    const minScaleY = currentHole.h / loadedImage.naturalHeight;
    const minScale = Math.max(minScaleX, minScaleY);
    
    scale = minScale;
    pan = { x: 0, y: 0 };
    
    zoomSlider.min = minScale.toFixed(4);
    zoomSlider.max = (minScale * 4).toFixed(4);
    zoomSlider.value = minScale.toFixed(4);
    
    cropImage.style.width = loadedImage.naturalWidth + 'px';
    cropImage.style.height = loadedImage.naturalHeight + 'px';
    
    clampPan();
    updateImageTransform();
}

function clampPan() {
    if (!loadedImage) return;
    
    const cw = cropContainer.clientWidth;
    const ch = cropContainer.clientHeight;
    const iw = loadedImage.naturalWidth * scale;
    const ih = loadedImage.naturalHeight * scale;
    
    const cx = cw / 2;
    const cy = ch / 2;
    
    const hx = currentHole.x;
    const hy = currentHole.y;
    const hw = currentHole.w;
    const hh = currentHole.h;
    
    const maxX = hx - cx + iw / 2;
    const minX = hx + hw - cx - iw / 2;
    const maxY = hy - cy + ih / 2;
    const minY = hy + hh - cy - ih / 2;
    
    if (iw >= hw) {
        pan.x = Math.max(minX, Math.min(maxX, pan.x));
    } else {
        pan.x = 0;
    }
    
    if (ih >= hh) {
        pan.y = Math.max(minY, Math.min(maxY, pan.y));
    } else {
        pan.y = 0;
    }
}

function updateImageTransform() {
    cropImage.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
}

// 7. Quantity Stepper
function setupStepper() {
    stepperMinus.addEventListener('click', () => {
        let val = parseInt(quantityInput.value);
        if (val > 1) {
            quantityInput.value = val - 1;
        }
    });
    
    stepperPlus.addEventListener('click', () => {
        let val = parseInt(quantityInput.value);
        if (val < 99) {
            quantityInput.value = val + 1;
        }
    });
    
    quantityInput.addEventListener('change', () => {
        let val = parseInt(quantityInput.value);
        if (isNaN(val) || val < 1) quantityInput.value = 1;
        if (val > 99) quantityInput.value = 99;
    });
}

// 8. Add to Queue Logic
addToQueueBtn.addEventListener('click', () => {
    if (!loadedImage) return;
    
    const cw = cropContainer.clientWidth;
    const ch = cropContainer.clientHeight;
    
    const ix = cw / 2 - (loadedImage.naturalWidth * scale) / 2 + pan.x;
    const iy = ch / 2 - (loadedImage.naturalHeight * scale) / 2 + pan.y;
    
    const srcX = (currentHole.x - ix) / scale;
    const srcY = (currentHole.y - iy) / scale;
    const srcW = currentHole.w / scale;
    const srcH = currentHole.h / scale;
    
    const targetDPI = 300;
    const canvasW = selectedSize.w_in * targetDPI;
    const canvasH = selectedSize.h_in * targetDPI;
    
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = canvasW;
    cropCanvas.height = canvasH;
    
    const ctx = cropCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
        loadedImage,
        srcX, srcY, srcW, srcH,
        0, 0, canvasW, canvasH
    );
    
    const croppedSrc = cropCanvas.toDataURL('image/jpeg', 0.95);
    
    const quantity = parseInt(quantityInput.value);
    const existingIndex = queue.findIndex(q => q.name === imageName && q.sizeLabel === selectedSize.label && q.w_in === selectedSize.w_in && q.h_in === selectedSize.h_in);
    
    if (existingIndex !== -1) {
        queue[existingIndex].quantity += quantity;
    } else {
        queue.push({
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: imageName,
            sizeLabel: selectedSize.label,
            w_in: selectedSize.w_in,
            h_in: selectedSize.h_in,
            colorClass: selectedSize.colorClass,
            quantity: quantity,
            croppedSrc: croppedSrc
        });
    }
    
    quantityInput.value = 1;
    
    rebuildQueueList();
    updateDownloadButtonState();
    
    // Clear editor workspace and return to placeholder screen
    showEditorPlaceholder();
});

// 9. Rebuild Queue list DOM
function rebuildQueueList() {
    const totalItemsCount = queue.reduce((sum, item) => sum + item.quantity, 0);
    queueBadge.textContent = totalItemsCount;
    
    if (queue.length === 0) {
        queueEmpty.classList.remove('hidden');
        queueItems.classList.add('hidden');
        queueActions.classList.add('hidden');
        return;
    }
    
    queueEmpty.classList.add('hidden');
    queueItems.classList.remove('hidden');
    queueActions.classList.remove('hidden');
    
    queueItems.innerHTML = '';
    
    queue.forEach(item => {
        const card = document.createElement('div');
        card.className = 'queue-card';
        
        let badgeClass = 'badge-pink';
        if (item.colorClass === 'size-blue') badgeClass = 'badge-blue';
        if (item.colorClass === 'size-yellow') badgeClass = 'badge-yellow';
        
        card.innerHTML = `
            <div class="queue-card-thumb">
                <img src="${item.croppedSrc}" alt="${item.name}">
            </div>
            <div class="queue-card-info">
                <span class="queue-card-name" title="${item.name}">${item.name}</span>
                <span class="queue-card-size-badge ${badgeClass}">${item.sizeLabel} • ${item.w_in.toFixed(2)}" x ${item.h_in.toFixed(2)}"</span>
            </div>
            <div class="queue-card-actions">
                <div class="number-stepper">
                    <button type="button" class="stepper-btn minus-btn" data-id="${item.id}">-</button>
                    <input type="number" value="${item.quantity}" readonly>
                    <button type="button" class="stepper-btn plus-btn" data-id="${item.id}">+</button>
                </div>
                <button type="button" class="queue-card-delete" data-id="${item.id}" title="Remove Item">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        
        card.querySelector('.minus-btn').addEventListener('click', () => {
            if (item.quantity > 1) {
                item.quantity--;
                rebuildQueueList();
                updateDownloadButtonState();
            }
        });
        
        card.querySelector('.plus-btn').addEventListener('click', () => {
            if (item.quantity < 99) {
                item.quantity++;
                rebuildQueueList();
                updateDownloadButtonState();
            }
        });
        
        card.querySelector('.queue-card-delete').addEventListener('click', () => {
            queue = queue.filter(q => q.id !== item.id);
            rebuildQueueList();
            updateDownloadButtonState();
        });
        
        queueItems.appendChild(card);
    });
}

function setupQueueActions() {
    clearQueueBtn.addEventListener('click', () => {
        queue = [];
        rebuildQueueList();
        updateDownloadButtonState();
    });
}

function updateDownloadButtonState() {
    if (queue.length === 0) {
        downloadPdfBtn.classList.add('disabled');
        downloadPdfBtn.disabled = true;
    } else {
        downloadPdfBtn.classList.remove('disabled');
        downloadPdfBtn.disabled = false;
    }
}

// 10. Listen to settings changes
function setupSettingsListeners() {
    paperSizeSelect.addEventListener('change', checkDimensionsFit);
    
    marginSlider.addEventListener('input', (e) => {
        marginVal.textContent = parseFloat(e.target.value).toFixed(2) + '"';
    });
    
    spacingSlider.addEventListener('input', (e) => {
        spacingVal.textContent = parseFloat(e.target.value).toFixed(2) + '"';
    });
}

// 12. 2D Guillotine Bin Packing Implementation
function packItems(itemsList, paperW, paperH, margin, spacing, allowRotate) {
    const flatItems = [];
    itemsList.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
            flatItems.push({
                id: item.id,
                name: item.name,
                sizeLabel: item.sizeLabel,
                w: item.w_in,
                h: item.h_in,
                croppedSrc: item.croppedSrc
            });
        }
    });

    flatItems.sort((a, b) => (b.w * b.h) - (a.w * a.h));

    const usableW = paperW - 2 * margin;
    const usableH = paperH - 2 * margin;
    const packedPages = [];

    flatItems.forEach(item => {
        let placed = false;

        for (let p = 0; p < packedPages.length; p++) {
            const page = packedPages[p];
            let bestSpaceIdx = -1;
            let bestScore = Infinity;
            let rotateSelected = false;

            for (let s = 0; s < page.freeSpaces.length; s++) {
                const fs = page.freeSpaces[s];

                if (item.w <= fs.w && item.h <= fs.h) {
                    const score = Math.min(fs.w - item.w, fs.h - item.h);
                    if (score < bestScore) {
                        bestScore = score;
                        bestSpaceIdx = s;
                        rotateSelected = false;
                    }
                }

                if (allowRotate && item.w !== item.h) {
                    if (item.h <= fs.w && item.w <= fs.h) {
                        const score = Math.min(fs.w - item.h, fs.h - item.w);
                        if (score < bestScore) {
                            bestScore = score;
                            bestSpaceIdx = s;
                            rotateSelected = true;
                        }
                    }
                }
            }

            if (bestSpaceIdx !== -1) {
                const fs = page.freeSpaces[bestSpaceIdx];
                const placedW = rotateSelected ? item.h : item.w;
                const placedH = rotateSelected ? item.w : item.h;

                page.placedItems.push({
                    x: fs.x,
                    y: fs.y,
                    w: placedW,
                    h: placedH,
                    originalW: item.w,
                    originalH: item.h,
                    isRotated: rotateSelected,
                    croppedSrc: item.croppedSrc,
                    name: item.name,
                    sizeLabel: item.sizeLabel
                });

                page.freeSpaces.splice(bestSpaceIdx, 1);

                const ew = Math.min(placedW + spacing, fs.w);
                const eh = Math.min(placedH + spacing, fs.h);

                let right, bottom;
                if (fs.w - ew > fs.h - eh) {
                    right = { x: fs.x + ew, y: fs.y, w: fs.w - ew, h: fs.h };
                    bottom = { x: fs.x, y: fs.y + eh, w: ew, h: fs.h - eh };
                } else {
                    right = { x: fs.x + ew, y: fs.y, w: fs.w - ew, h: eh };
                    bottom = { x: fs.x, y: fs.y + eh, w: fs.w, h: fs.h - eh };
                }

                if (right.w > 0.05 && right.h > 0.05) page.freeSpaces.push(right);
                if (bottom.w > 0.05 && bottom.h > 0.05) page.freeSpaces.push(bottom);

                placed = true;
                break;
            }
        }

        if (!placed) {
            const fitNormal = (item.w <= usableW && item.h <= usableH);
            const fitRotated = allowRotate && (item.h <= usableW && item.w <= usableH);

            const rotateSelected = !fitNormal && fitRotated;
            const placedW = rotateSelected ? item.h : item.w;
            const placedH = rotateSelected ? item.w : item.h;

            const newPage = {
                placedItems: [{
                    x: margin,
                    y: margin,
                    w: placedW,
                    h: placedH,
                    originalW: item.w,
                    originalH: item.h,
                    isRotated: rotateSelected,
                    croppedSrc: item.croppedSrc,
                    name: item.name,
                    sizeLabel: item.sizeLabel
                }],
                freeSpaces: []
            };

            const ew = Math.min(placedW + spacing, usableW);
            const eh = Math.min(placedH + spacing, usableH);

            let right, bottom;
            if (usableW - ew > usableH - eh) {
                right = { x: margin + ew, y: margin, w: usableW - ew, h: usableH };
                bottom = { x: margin, y: margin + eh, w: ew, h: usableH - eh };
            } else {
                right = { x: margin + ew, y: margin, w: usableW - ew, h: eh };
                bottom = { x: margin, y: margin + eh, w: usableW, h: usableH - eh };
            }

            if (right.w > 0.05 && right.h > 0.05) newPage.freeSpaces.push(right);
            if (bottom.w > 0.05 && bottom.h > 0.05) newPage.freeSpaces.push(bottom);

            packedPages.push(newPage);
        }
    });

    return packedPages;
}

// 13. PDF Generation (with Canvas rotation fallback)
downloadPdfBtn.addEventListener('click', generatePDF);

async function generatePDF() {
    if (queue.length === 0) return;
    
    downloadPdfBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...';
    downloadPdfBtn.classList.add('disabled');
    downloadPdfBtn.disabled = true;

    try {
        const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
        if (!jsPDFClass) {
            throw new Error("jsPDF library not found on global window namespace");
        }

        const paperSize = paperSizeSelect.value;
        let format = 'letter';
        
        if (paperSize === 'legal') format = 'legal';
        if (paperSize === 'a4') format = 'a4';

        const margin = parseFloat(marginSlider.value);
        const spacing = parseFloat(spacingSlider.value);
        const allowRotate = autoRotateCheckbox.checked;

        // Perform bin-packing calculation dynamically right before building the document
        pages = packItems(queue, format === 'letter' ? 8.5 : format === 'legal' ? 8.5 : 8.27, format === 'letter' ? 11.0 : format === 'legal' ? 14.0 : 11.69, margin, spacing, allowRotate);

        const doc = new jsPDFClass({
            orientation: 'portrait',
            unit: 'in',
            format: format
        });

        const drawCutMarks = cutMarksCheckbox.checked;

        for (let p = 0; p < pages.length; p++) {
            if (p > 0) {
                doc.addPage(format, 'portrait');
            }

            const page = pages[p];
            
            for (const item of page.placedItems) {
                let imgSrc = item.croppedSrc;
                
                if (item.isRotated) {
                    imgSrc = await rotateImage(item.croppedSrc, item.originalW, item.originalH);
                }

                doc.addImage(imgSrc, 'JPEG', item.x, item.y, item.w, item.h);

                if (drawCutMarks) {
                    doc.setDrawColor(180, 180, 180);
                    doc.setLineWidth(0.005);
                    
                    if (typeof doc.setLineDashPattern === 'function') {
                        doc.setLineDashPattern([0.05, 0.05], 0);
                    } else if (typeof doc.setLineDash === 'function') {
                        doc.setLineDash([0.05, 0.05], 0);
                    }
                    
                    doc.rect(item.x, item.y, item.w, item.h, 'S');
                }
            }
        }

        doc.save(`michi_method_print_${Date.now()}.pdf`);
    } catch (err) {
        console.error("PDF Generation failed:", err);
        alert("Failed to generate PDF. Check console for details.");
    } finally {
        downloadPdfBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Generate & Download PDF';
        downloadPdfBtn.classList.remove('disabled');
        downloadPdfBtn.disabled = false;
    }
}

// Draw image rotated 90 degrees on temporary canvas
function rotateImage(imgDataUrl, w_in, h_in) {
    return new Promise((resolve, reject) => {
        const tempImg = new Image();
        tempImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = h_in * 300;
            canvas.height = w_in * 300;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error("Could not construct 2D context"));
                return;
            }
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            
            const imgW = w_in * 300;
            const imgH = h_in * 300;
            
            ctx.drawImage(tempImg, -imgW / 2, -imgH / 2, imgW, imgH);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        tempImg.onerror = (err) => reject(err);
        tempImg.src = imgDataUrl;
    });
}

// 15. Original Size Chart Guide Modal
function setupModal() {
    viewGuideBtn.addEventListener('click', () => {
        guideModal.style.display = 'flex';
    });
    
    modalClose.addEventListener('click', () => {
        guideModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === guideModal) {
            guideModal.style.display = 'none';
        }
    });
}

// 16. Window resize listener to recalibrate cropper
window.addEventListener('resize', () => {
    if (loadedImage) {
        adjustCropOverlay();
        clampPan();
        updateImageTransform();
    }
});

// Start the app when HTML is loaded
document.addEventListener('DOMContentLoaded', init);
