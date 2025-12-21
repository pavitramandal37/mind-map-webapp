const API = {
    async request(url, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
            return null;
        }

        return response;
    },

    async getMap(id) {
        const response = await this.request(`/api/maps/${id}`);
        if (response && response.ok) {
            return await response.json();
        }
        return null;
    },

    async updateMap(id, data) {
        const response = await this.request(`/api/maps/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response && response.ok;
    }
};
