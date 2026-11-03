export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { payload, isImageGen, isTts, customApiKey } = req.body;
        const apiKey = customApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(400).json({ error: 'រកមិនឃើញ API Key ឡើយ! សូមកំណត់ GEMINI_API_KEY លើ Vercel ឬបញ្ចូលលើផ្ទាំង Settings' });
        }

        const apiVersion = "v1beta";

        // ១. ដំណើរការសំឡេង AI (TTS)
        if (isTts) {
            const ttsModel = "gemini-3.8-flash-tts";
            const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${ttsModel}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) {
                return res.status(response.status).json({ error: data.error?.message || 'TTS API Error' });
            }
            return res.status(200).json(data);
        }

        // ២. ដំណើរការតែងអត្ថបទ និងកែរូបភាព (Text & Image Generation)
        const models = isImageGen 
            ? ["gemini-2.5-flash-image-preview"] 
            : ["gemini-2.5-flash-preview-09-2025", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

        let lastError = "";
        for (const model of models) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                if (response.ok) {
                    return res.status(200).json(data);
                }
                lastError = data.error?.message || "Model request rejected";
            } catch (err) {
                lastError = err.message;
            }
        }

        return res.status(500).json({ error: lastError || 'បរាជ័យក្នុងការតភ្ជាប់ទៅកាន់ Gemini API' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
