import json

with open("words.json", "r") as file:
    data = json.load(file)

newData = []

for word in data:
    tempDict = {}
    tempDict["word"] = word
    tempDict["alternative"] = data[word]
    newData.append(tempDict)

print(newData)

with open("test.json", "w") as file:
    json.dump(newData, file, indent = 4)


