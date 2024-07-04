document.addEventListener('DOMContentLoaded', () => {
    new Vue({
        el: '#admin-app',
        data: {
            queries: []
        },
        created() {
            this.fetchQueries();
        },
        methods: {
            async fetchQueries() {
                try {
                    const response = await fetch('/api/queries');
                    this.queries = await response.json();
                } catch (error) {
                    console.error('Error fetching queries:', error);
                }
            },
            isImage(filePath) {
                return /\.(jpg|jpeg|png|gif)$/i.test(filePath);
            }
        }
    });
});
