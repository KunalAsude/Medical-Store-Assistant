/**
 * Format the AI response into structured data for the frontend
 * @param {string} aiMessage - The raw message from the AI
 * @returns {Object} - Structured data with summary, symptoms, remedies, and precautions
 */
export function formatResponse(aiMessage) {
    // If the message is empty or not a string, return an error
    if (!aiMessage || typeof aiMessage !== 'string') {
        return {
            error: "Invalid AI response received",
            summary: "Unable to process the medical information."
        };
    }

    try {
        // Initialize the response object
        const responseData = {
            summary: "",
            symptoms: [],
            remedies: [],
            precautions: []
        };

        // Extract summary (usually the first paragraph)
        const paragraphs = aiMessage.split('\n\n');
        if (paragraphs.length > 0) {
            responseData.summary = paragraphs[0].trim();
        }

        // Extract symptoms, remedies, and precautions using pattern matching
        const lines = aiMessage.split('\n');
        
        let currentSection = null;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) continue;
            
            // Check for section headers
            if (trimmedLine.toLowerCase().includes('symptom') || 
                trimmedLine.match(/symptoms:?/i)) {
                currentSection = 'symptoms';
                continue;
            } else if (trimmedLine.toLowerCase().includes('remed') || 
                       trimmedLine.match(/remedies:?|treatment:?/i)) {
                currentSection = 'remedies';
                continue;
            } else if (trimmedLine.toLowerCase().includes('precaution') || 
                       trimmedLine.toLowerCase().includes('warning') || 
                       trimmedLine.match(/precautions:?|when to see a doctor:?/i)) {
                currentSection = 'precautions';
                continue;
            }
            
            // Add content to the current section if we're in one
            if (currentSection) {
                // Check if the line is a bullet point or numbered item
                const listItemMatch = trimmedLine.match(/^[-•*]|\d+\.|\(\d+\)/);
                
                if (listItemMatch) {
                    // Clean up the line by removing the bullet or number
                    const cleanedLine = trimmedLine
                        .substring(listItemMatch[0].length)
                        .trim();
                    
                    if (cleanedLine) {
                        responseData[currentSection].push(cleanedLine);
                    }
                } else if (trimmedLine.length > 5 && !trimmedLine.endsWith(':')) {
                    // If it's not obviously a header, add it to the current section
                    responseData[currentSection].push(trimmedLine);
                }
            }
        }
        
        // If we couldn't find structured sections, try a simpler approach
        if (responseData.symptoms.length === 0 && 
            responseData.remedies.length === 0 && 
            responseData.precautions.length === 0) {
            
            // Try to extract any bullet points or numbered items
            const bulletRegex = /[-•*]|\d+\.|\(\d+\)\s+(.+)/g;
            let match;
            
            while ((match = bulletRegex.exec(aiMessage)) !== null) {
                const item = match[1] || match[0].replace(/[-•*]|\d+\.|\(\d+\)/, '').trim();
                
                if (item.toLowerCase().includes('pain') || 
                    item.toLowerCase().includes('fever') || 
                    item.toLowerCase().includes('symptom')) {
                    responseData.symptoms.push(item.trim());
                } else if (item.toLowerCase().includes('rest') || 
                          item.toLowerCase().includes('drink') || 
                          item.toLowerCase().includes('take')) {
                    responseData.remedies.push(item.trim());
                } else if (item.toLowerCase().includes('avoid') || 
                          item.toLowerCase().includes('consult') || 
                          item.toLowerCase().includes('doctor')) {
                    responseData.precautions.push(item.trim());
                }
            }
        }
        
        return responseData;
    } catch (error) {
        console.error("Error in formatResponse:", error);
        return {
            error: "Failed to parse AI response",
            summary: "There was an error processing the medical information."
        };
    }
}