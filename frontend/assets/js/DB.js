class DB {
    constructor() {
        // localStorage에서 users 배열을 가져오거나 없으면 빈 배열 생성
        this.users = JSON.parse(localStorage.getItem('users')) || [];
    }

    // 아이디 중복 체크
    checkDuplicateId(userId) {
        return this.users.some(user => user.id === userId);
    }

    // 새 사용자 추가
    addUser(userData) {
        this.users.push(userData);
        localStorage.setItem('users', JSON.stringify(this.users));
    }
}