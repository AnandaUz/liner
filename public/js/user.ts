import { Desk } from "./desk.js";
import { WeightLog } from "./types.js";

document.addEventListener('DOMContentLoaded', async () => {
    const targetUserIdEl = document.getElementById('target-user-id') as HTMLInputElement;
    const userId = targetUserIdEl?.value;
    if (!userId) return;

    try {
        const response = await fetch(`/api/user-data/${userId}`);
        if (!response.ok) {
            // throw new Error('Ошибка при загрузке данных');
        }

        const data = await response.json();
        renderUserData(data);
    } catch (error: any) {
        console.error('Error:', error);
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) userNameEl.textContent = 'Ошибка загрузки';
        const weightHistoryEl = document.getElementById('weight-history');
        if (weightHistoryEl) weightHistoryEl.innerHTML = `<tr><td colspan="3" class="text-center text-danger">${error.message}</td></tr>`;
    }
});

interface UserData {
    user: {
        id: string;
        name?: string;
        weightStart?: number;
        goal?: number;
        targetDate?: string;
    };
    weightLogs: WeightLog[];
}
function renderUserData(data: UserData) {
    const { user, weightLogs } = data;

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = user.name || 'Пользователь';
    
    if (weightLogs.length === 0) return;

    const dest = new Desk()
    dest.init(weightLogs)
}