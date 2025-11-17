import { loadUsers, saveUsers } from "../../data/userdata.js";


const MAX_POWER = 300;
const REGEN_INTERVAL = 5 * 60 * 1000


export function autoRegeneratePower(){
    setInterval(()=>
    {
        const users = loadUsers()
        let updated = false
        const now = Date.now()

        for(const id in users){
            const user = users[id]
            if(!user.lastPowerUpdate){
                user.lastPowerUpdate = now;
            }
            const elapsed = now - user.lastPowerUpdate
            const regen = Math.floor(elapsed / REGEN_INTERVAL)
            if(regen>0){
                user.power = Math.min((user.power||0)+regen, MAX_POWER)
                user.lastPowerUpdate+=regen * REGEN_INTERVAL
                updated = true
                
            }
        }
        if(updated){
            saveUsers(users)
            
        }
    }, 60 * 1000)
}
