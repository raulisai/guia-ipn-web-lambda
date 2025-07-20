//trae lobreria para agregar a una db de dynamodb
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const tableName = "reactivos";



export const handler = async (event) => {

  let questionToGpt = JSON.parse(event.body);

  try {

    const prompt = `
Toma el siguiente problema de matemáticas y la respuesta correcta.

Pregunta: ${questionToGpt.pregunta}
Respuesta correcta: ${questionToGpt.respuesta}

Genera un este json lo mas breve posible pero bien explicado y estructurado en el siguiente formato JSON:

{
  "explicacionRespuesta": "Explica detalladamente el razonamiento que conduce a la respuesta correcta.",
  "pasosParaResolverElProblema": [
    "Paso 1... con formulas",
    "Paso 2...o con referencias",
    "..."
  ],
  "conceptosORecordatorios": "Enumera ideas, fórmulas, hechos o definiciones que sean clave para responder.",
  "Tip": "Proporciona un consejo útil para deducir la respuesta con lógica o intuición.",
  "ejemploSimilar": "Un ejercicio o situación breve similar para reforzar el aprendizaje."
}

Responde solo con el JSON.
`;

const openia = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "xxxxxxxxx",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await openia.json();
    const message = data.choices[0].message.content;

    const id = randomUUID();
    const params = {
      TableName: tableName,
      Item: {
        ...questionToGpt,
        messageGpt: message,
        id: id

      },
    };
    await ddbDocClient.send(new PutCommand(params));

    const response = {
      statusCode: 200,
      body: message,
    };
    return response;

  } catch (err) {
    console.error(`Error: ${err.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "some error happened",
        error: err
      }),
    };
  }






};
