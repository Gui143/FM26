package com.example;

import com.google.genai.Client;
import com.google.genai.interactions.models.interactions.Content;
import com.google.genai.interactions.models.interactions.CreateModelInteractionParams;
import com.google.genai.interactions.models.interactions.Interaction;
import com.google.genai.interactions.models.interactions.Step;

/**
 * Optional Java smoke client for the same server-side NPC integration.
 * Never place GEMINI_API_KEY in source control or browser code.
 */
public final class NpcGemini {
  private NpcGemini() {}

  public static void main(String[] args) {
    String apiKey = System.getenv("GEMINI_API_KEY");
    if (apiKey == null || apiKey.isBlank()) {
      throw new IllegalStateException("Configure GEMINI_API_KEY in the process environment.");
    }

    String model = System.getenv().getOrDefault("GEMINI_MODEL", "gemini-3.5-flash");
    String input = args.length == 0
        ? "Responda como o pai de um jovem jogador depois de um treino difícil, em duas frases."
        : String.join(" ", args);

    Client client = Client.builder().apiKey(apiKey).build();
    CreateModelInteractionParams params = CreateModelInteractionParams.builder()
        .model(model)
        .input(input)
        .build();
    Interaction interaction = client.interactions.create(params);

    for (Step step : interaction.steps()) {
      if (!step.isModelOutput()) continue;
      step.asModelOutput().content().ifPresent(contents -> {
        for (Content content : contents) {
          content.text().ifPresent(text -> System.out.println(text.text()));
        }
      });
    }
  }
}
