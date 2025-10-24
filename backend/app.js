const db = require('./DB');

async function testDB() {
    try {
        const [rows] = await db.query('SELECT * FROM test');
        console.log('test 테이블 데이터:');
        rows.forEach(row => {
            console.log(`id: ${row.id}, comment: ${row.comment}`);
        });
    } catch (err) {
        console.error('DB 오류:', err);
    } finally {
        db.end(); // 연결 종료
    }
}

testDB();
