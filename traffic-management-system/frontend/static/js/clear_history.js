
// Added function to support Clear History
function clearHistory() {
    if (confirm("ARE YOU SURE? This will permanently delete all violation data, challan PDFs, and snapshots. This action cannot be undone.")) {
        fetch('/api/clear_history', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert("System history cleared successfully.");
                    location.reload(); // Reload to reset all UI states
                } else {
                    alert("Error clearing history: " + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Failed to clear history.");
            });
    }
}
