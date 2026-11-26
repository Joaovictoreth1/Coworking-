# Como contribuir

1. Para uma mudança ampla, abra uma [issue](https://github.com/Joaovictoreth1/Coworking-/issues/new/choose) e descreva o problema antes de começar. Para vulnerabilidades, siga a [política de segurança](SECURITY.md).
2. Faça um fork, sincronize a branch `main` e crie uma branch para a mudança.
3. Configure o projeto pelo [início rápido](README.md#início-rápido). Faça um diff focado, siga o estilo do módulo e acrescente testes para alterações de comportamento.
4. Rode as verificações aplicáveis e registre resultados e limitações no pull request:

   | Módulo | Comando na raiz |
   | --- | --- |
   | Backend | `(cd backend && php artisan test && vendor/bin/pint --test)` |
   | Backend no Compose | `docker compose exec backend php artisan test` e `docker compose exec backend vendor/bin/pint --test` |
   | Frontend | `(cd frontend && npm run lint && npm run build)` |
   | Mobile | `(cd mobile && flutter analyze --no-fatal-infos && flutter test)` |

5. Abra o pull request para `main`, vinculando a issue quando existir. Inclua instruções de teste, efeitos sobre dados ou configuração e capturas para mudanças visuais, sem informações pessoais.

Não envie arquivos `.env`, tokens, senhas ou dumps com dados reais. Para mudanças de contrato, atualize a documentação junto com o código e explicite incompatibilidades. A participação neste projeto segue o [código de conduta](CODE_OF_CONDUCT.md).
