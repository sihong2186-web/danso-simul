/**
 * Elementary School 3rd Grade Danso Practice Songs (초등 3학년 단소 연습곡)
 * 정간보 및 율명 악보 데이터
 */

const DANSO_SONGS = [
    {
        id: 'airplane',
        title: '✈️ 떴다 떴다 비행기',
        tempo: 90,
        description: '황·임·중 음을 연습하기 가장 좋은 첫걸음 동요입니다.',
        notes: [
            { note: '潢', kor: '황', lyrics: '떴', holes: [false, false, false, false] },
            { note: '林', kor: '임', lyrics: '다', holes: [true, true, false, false] },
            { note: '仲', kor: '중', lyrics: '떴', holes: [true, true, true, false] },
            { note: '林', kor: '임', lyrics: '다', holes: [true, true, false, false] },
            { note: '潢', kor: '황', lyrics: '비', holes: [false, false, false, false] },
            { note: '潢', kor: '황', lyrics: '행', holes: [false, false, false, false] },
            { note: '潢', kor: '황', lyrics: '기', holes: [false, false, false, false] },
            { note: '林', kor: '임', lyrics: '날', holes: [true, true, false, false] },
            { note: '林', kor: '임', lyrics: '아', holes: [true, true, false, false] },
            { note: '林', kor: '임', lyrics: '라', holes: [true, true, false, false] },
            { note: '潢', kor: '황', lyrics: '날', holes: [false, false, false, false] },
            { note: '潢', kor: '황', lyrics: '아', holes: [false, false, false, false] },
            { note: '潢', kor: '황', lyrics: '라', holes: [false, false, false, false] },
            { note: '潢', kor: '황', lyrics: '높', holes: [false, false, false, false] },
            { note: '林', kor: '임', lyrics: '이', holes: [true, true, false, false] },
            { note: '仲', kor: '중', lyrics: '높', holes: [true, true, true, false] },
            { note: '林', kor: '임', lyrics: '이', holes: [true, true, false, false] },
            { note: '潢', kor: '황', lyrics: '날', holes: [false, false, false, false] },
            { note: '潢', kor: '황', lyrics: '아', holes: [false, false, false, false] },
            { note: '潢', kor: '황', lyrics: '라', holes: [false, false, false, false] },
            { note: '林', kor: '임', lyrics: '우', holes: [true, true, false, false] },
            { note: '林', kor: '임', lyrics: '리', holes: [true, true, false, false] },
            { note: '潢', kor: '황', lyrics: '비', holes: [false, false, false, false] },
            { note: '林', kor: '임', lyrics: '행', holes: [true, true, false, false] },
            { note: '仲', kor: '중', lyrics: '기', holes: [true, true, true, false] }
        ]
    },
    {
        id: 'arirang',
        title: '🌸 아리랑 (경기 아리랑)',
        tempo: 75,
        description: '우리나라 대표 민요로 중·임·무·황·태 5음을 모두 익힐 수 있습니다.',
        notes: [
            { note: '仲', kor: '중', lyrics: '아', holes: [true, true, true, false] },
            { note: '林', kor: '임', lyrics: '리', holes: [true, true, false, false] },
            { note: '無', kor: '무', lyrics: '랑', holes: [true, false, false, false] },
            { note: '林', kor: '임', lyrics: '아', holes: [true, true, false, false] },
            { note: '仲', kor: '중', lyrics: '리', holes: [true, true, true, false] },
            { note: '林', kor: '임', lyrics: '랑', holes: [true, true, false, false] },
            { note: '潢', kor: '황', lyrics: '아', holes: [false, false, false, false] },
            { note: '汰', kor: '태', lyrics: '라', holes: [false, true, false, false] },
            { note: '潢', kor: '황', lyrics: '리', holes: [false, false, false, false] },
            { note: '仲', kor: '중', lyrics: '요', holes: [true, true, true, false] },
            { note: '潢', kor: '황', lyrics: '아', holes: [false, false, false, false] },
            { note: '汰', kor: '태', lyrics: '리', holes: [false, true, false, false] },
            { note: '潢', kor: '황', lyrics: '랑', holes: [false, false, false, false] },
            { note: '林', kor: '임', lyrics: '고', holes: [true, true, false, false] },
            { note: '仲', kor: '중', lyrics: '개', holes: [true, true, true, false] },
            { note: '林', kor: '임', lyrics: '로', holes: [true, true, false, false] },
            { note: '無', kor: '무', lyrics: '넘', holes: [true, false, false, false] },
            { note: '林', kor: '임', lyrics: '어', holes: [true, true, false, false] },
            { note: '仲', kor: '중', lyrics: '간', holes: [true, true, true, false] },
            { note: '仲', kor: '중', lyrics: '다', holes: [true, true, true, false] }
        ]
    },
    {
        id: 'birds',
        title: '🐦 새야 새야 파랑새야',
        tempo: 70,
        description: '중·임·무 3음으로 쉽게 시작하는 전래 동요입니다.',
        notes: [
            { note: '仲', kor: '중', lyrics: '새', holes: [true, true, true, false] },
            { note: '仲', kor: '중', lyrics: '야', holes: [true, true, true, false] },
            { note: '林', kor: '임', lyrics: '새', holes: [true, true, false, false] },
            { note: '林', kor: '임', lyrics: '야', holes: [true, true, false, false] },
            { note: '無', kor: '무', lyrics: '파', holes: [true, false, false, false] },
            { note: '無', kor: '무', lyrics: '랑', holes: [true, false, false, false] },
            { note: '林', kor: '임', lyrics: '새', holes: [true, true, false, false] },
            { note: '林', kor: '임', lyrics: '야', holes: [true, true, false, false] },
            { note: '仲', kor: '중', lyrics: '녹', holes: [true, true, true, false] },
            { note: '仲', kor: '중', lyrics: '두', holes: [true, true, true, false] },
            { note: '林', kor: '임', lyrics: '밭', holes: [true, true, false, false] },
            { note: '林', kor: '임', lyrics: '에', holes: [true, true, false, false] },
            { note: '無', kor: '무', lyrics: '앉', holes: [true, false, false, false] },
            { note: '林', kor: '임', lyrics: '지', holes: [true, true, false, false] },
            { note: '仲', kor: '중', lyrics: '마', holes: [true, true, true, false] },
            { note: '仲', kor: '중', lyrics: '라', holes: [true, true, true, false] }
        ]
    }
];

window.DANSO_SONGS = DANSO_SONGS;
