const userCardTemplate = document.querySelector("[data-user-template")
const userCardContainer = document.querySelector("[data-user-card-container")
const searchInput = document.querySelector("[data-search]")

let users = []

searchInput.addEventListener("input", (e) => {
    const value = e.target.value.toLowerCase()
    
    words.forEach(word => {
        const isVisible = word.word.toLowerCase().includes(value) || word.alternatives.toLowerCase().includes(value)
        word.element.classList.toggle("hide", !isVisible)
    })

})

fetch("./words.json")
.then(response => {
   return response.json();
})
.then(data => {
    words = data.map(word => {
    const card = userCardTemplate.content.cloneNode(true).children[0]
    const header = card.querySelector("[data-header]")
    const body = card.querySelector("[data-body]")

    alternatives = word.alternative

    for(var i = 0 ; i < alternatives.length ; i++){
        alternatives[i] = alternatives[i][0].toUpperCase() + alternatives[i].substring(1)
    }       

    header.textContent = word.word[0].toUpperCase() + word.word.substring(1)
    body.textContent = alternatives.join(", ")
    userCardContainer.append(card)
    return { word: word.word[0].toUpperCase() + word.word.substring(1), alternatives: alternatives.join(", "), element: card}
})
});