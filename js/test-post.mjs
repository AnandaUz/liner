import fetch from "node-fetch"; // node 18+ встроен fetch


console.log('тестовый запрос - начало')
const url = "http://localhost:3000/api/bot_isee";

/*
const body = {
    message: {
        "update_id": 123456,
        "message": {
            "message_id": 1,
            "from": { "id": 111, "is_bot": false, "first_name": "Ananda" },
            "chat": { "id": 111, "first_name": "Ananda", "type": "private" },
            "date": 1695043200,
            "text": "/start mastermind",
            "entities": [{ "offset": 0, "length": 6, "type": "bot_command" }]
        }
    }
};
*/
const body = {
    message: {
        "update_id": 268492456,
        "message": {
            "message_id": 61,
            "from": {
                "id": 117952884,
                "is_bot": false,
                "first_name": "Ananda",
                "last_name": "Shadrin",
                "username": "ananda_uz",
                "language_code": "en"
            },
            "chat": {
                "id": 117952884,
                "first_name": "Ananda",
                "last_name": "Shadrin",
                "username": "ananda_uz",
                "type": "private"
            },
            "date": 1770274804,
            "text": "88.5"
        }
    }
};

(async () => {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    console.log("status:", res.status);
    console.log(await res.text());
})();


