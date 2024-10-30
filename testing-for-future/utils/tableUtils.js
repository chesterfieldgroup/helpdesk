export const commonMethods = {
    toggleFilterPanel() {
        this.showFilters = !this.showFilters;
    },
    toggleSortOrder() {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        this.queries.sort((a, b) => {
            return this.sortOrder === 'asc'
                ? new Date(a.timestamp) - new Date(b.timestamp)
                : new Date(b.timestamp) - new Date(a.timestamp);
        });
    },
    nextPage() {
        if (this.currentPage < this.totalPages) this.currentPage++;
    },
    prevPage() {
        if (this.currentPage > 1) this.currentPage--;
    },
    toggleImageModal(screenshots) {
        this.selectedScreenshots = screenshots;
        this.showImageModal = true;
    },
    closeImageModal() {
        this.showImageModal = false;
    }
};

export async function fetchQueries() {
    try {
        const response = await fetch('/api/queries');
        const data = await response.json();
        return data.map(query => ({
            ...query,
            screenshots: query.screenshots || []
        }));
    } catch (error) {
        console.error("Error fetching queries:", error);
        return [];
    }
}
