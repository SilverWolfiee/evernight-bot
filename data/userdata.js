import fs from "fs";
const path = "./data/users.json"

export function loadUsers(){
    if(!fs.existsSync(path)){
        return{};
    }
    return JSON.parse(fs.readFileSync(path, 'utf8'))
}
export function saveUsers(){
    fs.writeFileSync(path, JSON.stringify(DataTransfer, null, 2))
}
export function checkUser(userId){
    const user = loadUsers()
    if(!users[userId]){
        users[userId] = {
        jades: 0,
        credits: 0,
        pity: 0,
        registeredAt: new Date().toISOString(),
    }
    saveUsers(user)
    return user[userId]
    }
    return user[userId]
}