const userCardTemplate = document.querySelector("[data-user-template")
const userCardContainer = document.querySelector("[data-user-card-container")


fetch("./test.json")
.then(response => {
   return response.json();
})
.then(data => {
    data.forEach(user => {
    const card = userCardTemplate.content.cloneNode(true).children[0]
    const header = card.querySelector("[data-header]")
    const body = card.querySelector("[data-body]")

    alternatives = user.alternative

    for(var i = 0 ; i < alternatives.length ; i++){
        alternatives[i] = alternatives[i][0].toUpperCase() + alternatives[i].substring(1)
    }       

    header.textContent = user.word[0].toUpperCase() + user.word.substring(1)
    body.textContent = alternatives.join(", ")
    userCardContainer.append(card)
})
});