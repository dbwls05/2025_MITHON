class DB {
    constructor() {
        // localStorage에서 사용자 데이터 가져오기
        this.users = JSON.parse(localStorage.getItem('users')) || [];
    }

    // 아이디 중복 검사
    checkDuplicateId(userId) {
        return this.users.some(user => user.id === userId);
    }

    // 새 사용자 추가
    addUser(userData) {
        this.users.push(userData);
        // localStorage에 저장
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    // 사용자 조회
    getUser(userId) {
        return this.users.find(user => user.id === userId);
    }
}