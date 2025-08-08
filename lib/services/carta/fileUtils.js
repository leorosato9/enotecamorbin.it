export const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
});

export const base64ToFile = async (base64, filename, mimeType) => {
    const res = await fetch(base64);
    const blob = await res.blob();
    return new File([blob], filename, { type: mimeType });
};