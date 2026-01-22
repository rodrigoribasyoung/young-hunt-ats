# Correção: Evento onFormSubmit não contém namedValues

## Problema Identificado

Quando o formulário foi enviado (Carla, 17:20), o evento `onFormSubmit` não continha `namedValues`, `values` ou `range`. O evento tinha apenas:
- `toString`
- `authMode`
- `response`
- `source`
- `triggerUid`

Isso indica que o formato do evento mudou ou o script está recebendo um formato diferente do esperado.

## Solução Implementada

A função `onFormSubmit()` foi atualizada para suportar **múltiplos formatos de evento**:

### Formato 1: `e.namedValues` (formato tradicional)
- Usado quando o evento tem `namedValues` diretamente
- Formato: `{ "Nome completo:": ["João Silva"], ... }`

### Formato 2: `e.response` (novo formato)
- Usado quando o evento tem `response` (objeto FormResponse)
- Extrai dados usando `formResponse.getItemResponses()`
- Converte para o formato esperado (`namedValues`)
- Adiciona "Carimbo de data/hora" automaticamente

### Formato 3: `e.source` (script vinculado à planilha)
- Detecta se o script está vinculado à planilha ao invés do formulário
- Informa ao usuário como corrigir

## Como Testar

1. **Atualize o código no AppScript** com a versão corrigida de `assets/.APPSCRIPT.txt`

2. **Envie um formulário de teste** e verifique os logs:
   - Deve aparecer "✅ Usando formato e.response" ou "✅ Usando formato e.namedValues"
   - Deve mostrar os campos extraídos
   - Deve processar e enviar para o Firebase

3. **Se ainda não funcionar**, execute `diagnosticarEvento(e)` dentro do `onFormSubmit` para ver mais detalhes:
   ```javascript
   // Adicione esta linha no início de onFormSubmit:
   diagnosticarEvento(e);
   ```

## Verificação do Gatilho

Certifique-se de que o gatilho está configurado corretamente:

1. No editor do Apps Script: **Editar → Gatilhos do projeto atual**
2. Deve haver UM gatilho com:
   - **Função:** `onFormSubmit`
   - **Origem do evento:** `Do formulário` (NÃO "Da planilha")
   - **Tipo de evento:** `Ao enviar o formulário`

3. Se houver gatilhos incorretos (time-based ou vinculados à planilha), remova-os

## Próximos Passos

1. Atualize o código no AppScript
2. Envie um formulário de teste
3. Verifique os logs para ver qual formato está sendo usado
4. Verifique se o candidato aparece no Firebase e no frontend

Se o problema persistir, os logs detalhados ajudarão a identificar o formato exato do evento.
