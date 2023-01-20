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
    header.textContent = user.word
    body.textContent = user.alternative
    userCardContainer.append(card)
})
});