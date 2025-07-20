// Ejemplo de JSON que se puede enviar en el body de la request
// {
//   "pregunta": "your problem here",
//   "respuesta": "the correct answer",
//   "type": "matematicas" // Or "biologia", "espanol", "fisica"
// }



// Librerías para trabajar con DynamoDB
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-east-2" }));
const tableName = "reactivos";

// Definición de prompts según el tipo o materia
const PROMPT_TYPES = {
  // Prompt general por defecto
  default: `
Toma el siguiente problema y la respuesta correcta.

Pregunta: {{pregunta}}
Respuesta correcta: {{respuesta}}

Genera un JSON breve, claro y bien estructurado en el siguiente formato, utilizando **notación matemática compatible con KaTeX** cuando sea necesario:

{
  "explicacionRespuesta": "Explica detalladamente y de forma breve el razonamiento que lleva a la respuesta correcta, usando notación especializada donde sea apropiado.",
  "pasosParaResolverElProblema": [
    "Paso 1: ... Explica usando la notación adecuada para la materia.",
    "Paso 2: ...",
    "..."
  ],
  "conceptosORecordatorios": "Enumera de manera breve las ideas, fórmulas, hechos o definiciones clave relacionadas con la pregunta.",
  "Tip": "Proporciona un consejo breve y práctico para deducir la respuesta usando lógica o intuición.",
  "ejemploSimilar": "Incluye un ejercicio o situación breve y similar que ayude a reforzar el aprendizaje."
}

Responde **solo** con el JSON, sin ningún comentario adicional.
`,
  
  // Prompt simplificado
  simple: `
Toma el siguiente problema y la respuesta correcta.

Pregunta: {{pregunta}}
Respuesta correcta: {{respuesta}}

Genera un JSON breve y simple con solo la explicación básica:

{
  "explicacionRespuesta": "Explica de forma simple y concisa el razonamiento que lleva a la respuesta correcta.",
  "pasosParaResolverElProblema": [
    "Paso 1: ...",
    "Paso 2: ..."
  ]
}

Responde **solo** con el JSON, sin ningún comentario adicional.
`,

  // ===== PROMPTS PARA MATERIAS ESPECÍFICAS DEL EXAMEN IPN =====
  
  // Matemáticas
  matematicas: `
Toma el siguiente problema de matemáticas y la respuesta correcta para el examen del IPN.

Pregunta: {{pregunta}}
Respuesta correcta: {{respuesta}}

Genera un JSON breve, claro y bien estructurado en el siguiente formato, utilizando **notación matemática compatible con KaTeX** para todas las expresiones matemáticas:

{
  "explicacionRespuesta": "Explica detalladamente y de forma breve el razonamiento que lleva a la respuesta correcta, usando fórmulas y símbolos matemáticos en KaTeX.",
  "pasosParaResolverElProblema": [
    "Paso 1: ... Incluye ecuaciones, fórmulas, teoremas o propiedades usando notación KaTeX.",
    "Paso 2: ... Muestra las transformaciones o cálculos paso a paso.",
    "..."
  ],
  "conceptosORecordatorios": "Enumera fórmulas clave, propiedades, teoremas o definiciones usando notación KaTeX que son fundamentales para resolver el problema.",
  "Tip": "Proporciona un atajo matemático o método de verificación rápido para problemas similares.",
  "ejemploSimilar": "Incluye un problema matemático similar pero más sencillo que refuerce el mismo concepto, con su solución usando notación KaTeX."
}

Responde **solo** con el JSON, sin ningún comentario adicional.
`,
  
  // Biología
  biologia: `
Toma el siguiente problema de biología y la respuesta correcta para el examen del IPN.

Pregunta: {{pregunta}}
Respuesta correcta: {{respuesta}}

Genera un JSON breve, claro y bien estructurado en el siguiente formato:

{
  "explicacionRespuesta": "Explica detalladamente y de forma breve el fundamento biológico que sustenta la respuesta correcta, mencionando procesos, estructuras o mecanismos relevantes.",
  "pasosParaResolverElProblema": [
    "Paso 1: ... Describe el razonamiento o proceso biológico involucrado.",
    "Paso 2: ... Menciona las relaciones causales o funcionales relevantes.",
    "..."
  ],
  "conceptosORecordatorios": "Enumera conceptos clave, procesos biológicos, clasificaciones taxonómicas o terminología especializada relevante para la pregunta.",
  "Tip": "Proporciona una regla mnemotécnica o método para recordar la relación biológica clave del problema.",
  "ejemploSimilar": "Incluye un ejemplo relacionado que aplique el mismo principio biológico en otro contexto."
}

Responde **solo** con el JSON, sin ningún comentario adicional.
`,
  
  // Español
  espanol: `
Toma el siguiente problema de español y la respuesta correcta para el examen del IPN.

Pregunta: {{pregunta}}
Respuesta correcta: {{respuesta}}

Genera un JSON breve, claro y bien estructurado en el siguiente formato:

{
  "explicacionRespuesta": "Explica detalladamente y de forma breve la regla gramática, literaria o lingüística que justifica la respuesta correcta.",
  "pasosParaResolverElProblema": [
    "Paso 1: ... Identifica la categoría o aspecto del lenguaje que se está evaluando.",
    "Paso 2: ... Aplica las reglas o criterios relevantes.",
    "..."
  ],
  "conceptosORecordatorios": "Enumera reglas gramaticales, figuras literarias, normas ortográficas o conceptos lingüísticos clave para responder correctamente.",
  "Tip": "Proporciona un método práctico para verificar rápidamente este tipo de problemas lingüísticos.",
  "ejemploSimilar": "Incluye un ejemplo adicional que aplique la misma regla o concepto lingüístico."
}

Responde **solo** con el JSON, sin ningún comentario adicional.
`,
  
  // Física
  fisica: `
Toma el siguiente problema de física y la respuesta correcta para el examen del IPN.

Pregunta: {{pregunta}}
Respuesta correcta: {{respuesta}}

Genera un JSON breve, claro y bien estructurado en el siguiente formato, utilizando **notación matemática compatible con KaTeX** para todas las fórmulas físicas:

{
  "explicacionRespuesta": "Explica detalladamente y de forma breve el principio físico que justifica la respuesta correcta, usando fórmulas y símbolos en notación KaTeX cuando sea necesario.",
  "pasosParaResolverElProblema": [
    "Paso 1: ... Identifica las leyes físicas aplicables y las variables relevantes.",
    "Paso 2: ... Aplica las ecuaciones correspondientes y realiza los cálculos necesarios en notación KaTeX.",
    "..."
  ],
  "conceptosORecordatorios": "Enumera leyes físicas, principios, constantes o fórmulas clave usando notación KaTeX que son fundamentales para este problema.",
  "Tip": "Proporciona un método de verificación dimensional o aproximación rápida para problemas similares.",
  "ejemploSimilar": "Incluye un problema físico similar pero con valores diferentes que aplique el mismo principio, con su solución usando notación KaTeX."
}

Responde **solo** con el JSON, sin ningún comentario adicional.
`
};


export const handler = async (event) => {

  let questionToGpt = JSON.parse(event.body);
  
  // Determinar qué tipo de prompt usar (default si no se especifica)
  const promptType = questionToGpt.type || 'default';
  
  try {
    // Seleccionar el prompt según el tipo o usar el default si no existe
    let promptTemplate = PROMPT_TYPES[promptType] || PROMPT_TYPES.default;
    
    // Reemplazar placeholders con los valores reales
    const prompt = promptTemplate
      .replace('{{pregunta}}', questionToGpt.pregunta)
      .replace('{{respuesta}}', questionToGpt.respuesta);

const openia = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "xxxxxxxxx",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
        promptType: promptType,
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
