import Tesseract from 'tesseract.js';

// --- Image Preprocessing ---
const preprocessImage = (imageSoruce) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imageSoruce;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Convert to grayscale and increase contrast
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                // Binarize (thresholding)
                const color = avg > 128 ? 255 : 0;
                data[i] = color;     // R
                data[i + 1] = color; // G
                data[i + 2] = color; // B
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        };
    });
};

// --- Main OCR Function ---
export const analyzeImage = async (imageFile) => {
    try {
        // 1. Preprocess the image for better accuracy
        const processedImage = await preprocessImage(imageFile);

        // 2. Perform OCR
        const result = await Tesseract.recognize(
            processedImage,
            'eng',
            { logger: m => console.log(m) }
        );

        const text = result.data.text;
        console.log("OCR Raw Text:", text);

        // 3. Extract Data
        return {
            text,
            amount: extractAmount(text),
            date: extractDate(text),
            category: extractCategory(text)
        };
    } catch (error) {
        console.error("OCR Failed:", error);
        return { text: "", amount: "", date: "" };
    }
};

const extractAmount = (text) => {
    // Matches "₹ 500", "Rs. 1,234.00", "500.00"
    // Prioritizes lines with currency symbols
    const lines = text.split('\n');
    for (const line of lines) {
        if (line.includes('₹') || line.toLowerCase().includes('rs')) {
            const match = line.match(/[\d,]+\.?\d*/);
            if (match) return match[0].replace(/,/g, '');
        }
    }

    // Fallback: look for generic number patterns if no symbol found
    // Exclude 4-digit years (2024, 2025) to avoid date confusion
    const amountRegex = /\b\d{1,3}(,\d{3})*(\.\d{2})?\b/g;
    const matches = text.match(amountRegex);
    if (matches) {
        // Filter out common date years if they appear isolated
        const candidates = matches.filter(m => !m.match(/^(202\d)$/));
        return candidates[0] ? candidates[0].replace(/,/g, '') : "";
    }

    return "";
};

const extractDate = (text) => {
    const dateRegex = /\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2}/;
    const match = text.match(dateRegex);
    return match ? match[0] : new Date().toISOString().split('T')[0];
};

const extractCategory = (text) => {
    const t = text.toLowerCase();
    if (t.includes('zomato') || t.includes('swiggy') || t.includes('restaurant') || t.includes('food')) return 'Food';
    if (t.includes('uber') || t.includes('ola') || t.includes('fuel') || t.includes('petrol')) return 'Travel';
    if (t.includes('amazon') || t.includes('flipkart') || t.includes('mart')) return 'Shopping';
    if (t.includes('pharmacy') || t.includes('hospital') || t.includes('doctor')) return 'Health';
    return 'Other';
};
