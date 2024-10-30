import { commonMethods, fetchQueries } from './utils/tableUtils.js';

new Vue({
    el: '#app',
    data() {
        return {
            queries: [],
            currentPage: 1,
            itemsPerPage: 10,
            sortOrder: 'asc',
            showFilters: false,
            searchId: '',
            filterEngineer: '',
            showImageModal: false,
            selectedScreenshots: []
        };
    },
    computed: {
        filteredQueries() {
            return this.queries.filter(query => {
                const matchesId = !this.searchId || query.id.includes(this.searchId);
                const matchesEngineer = !this.filterEngineer || query.engineer === this.filterEngineer;
                return matchesId && matchesEngineer;
            });
        },
        paginatedQueries() {
            const start = (this.currentPage - 1) * this.itemsPerPage;
            const end = this.currentPage * this.itemsPerPage;
            return this.filteredQueries.slice(start, end);
        },
        totalPages() {
            return Math.ceil(this.filteredQueries.length / this.itemsPerPage);
        }
    },
    methods: {
        ...commonMethods,
        async loadQueries() {
            this.queries = await fetchQueries();
        }
    },
    created() {
        this.loadQueries();
    }
});
