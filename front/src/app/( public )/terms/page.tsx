// app/(public)/legal/page.tsx
"use client";

import Link from "next/link";

export default function LegalPage() {
  const lastUpdate = new Date().toLocaleDateString("pt-BR");

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10 space-y-8">
        {/* Cabeçalho */}
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Eleva
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
            Termos de Uso &amp; Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Última atualização: <span className="font-medium">{lastUpdate}</span>
          </p>

          {/* Índice simples */}
          <nav className="mt-4 flex flex-wrap gap-3 text-xs sm:text-sm">
            <a
              href="#termos-de-uso"
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              Termos de Uso
            </a>
            <a
              href="#politica-de-privacidade"
              className="rounded-full border border-border bg-muted/40 px-3 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              Política de Privacidade
            </a>
          </nav>
        </header>

        {/* ===================================== */}
        {/*            TERMOS DE USO              */}
        {/* ===================================== */}
        <section id="termos-de-uso" className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground">
            Termos de Uso
          </h2>

          {/* 1. Aceitação */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              1. Aceitação dos Termos
            </h3>
            <p>
              Ao criar uma conta ou utilizar o Eleva (&quot;Plataforma&quot;, &quot;nós&quot;),
              você declara que leu, entendeu e concorda com estes Termos de Uso.
              Se você não concordar com qualquer condição aqui descrita, não
              deverá utilizar a plataforma.
            </p>
            <p>
              Estes Termos se aplicam a todos os tipos de acesso disponíveis no
              Eleva, incluindo, mas não se limitando a:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Usuário (pessoa que registra suas medidas e evolução);</li>
              <li>Profissional (treinador/nutricionista, quando aplicável);</li>
              <li>Admin (gestão da plataforma).</li>
            </ul>
          </div>

          {/* 2. Sobre o Eleva */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              2. Sobre o Eleva
            </h3>
            <p>
              O Eleva é uma plataforma digital focada em acompanhamento de
              evolução física, permitindo o registro de medidas corporais,
              fotos de progresso, metas, treinos, dietas e outras informações
              relacionadas à sua rotina de saúde e bem-estar.
            </p>
            <p>
              O objetivo é ajudar você a visualizar seu progresso ao longo do
              tempo e, quando aplicável, facilitar o acompanhamento por
              profissionais habilitados. O Eleva não substitui consultas com
              médicos, nutricionistas, educadores físicos ou outros profissionais
              da saúde.
            </p>
          </div>

          {/* 3. Conta */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              3. Cadastro, Conta e Segurança
            </h3>
            <p>Para utilizar o Eleva, você deve:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fornecer informações verdadeiras, completas e atualizadas;</li>
              <li>Manter a confidencialidade de seu e-mail e senha;</li>
              <li>Notificar o Eleva em caso de suspeita de acesso não autorizado.</li>
            </ul>
            <p>
              Você é responsável por todas as ações realizadas a partir da sua conta.
              Poderemos suspender ou encerrar contas em caso de uso indevido, fraude
              ou violação destes Termos.
            </p>
          </div>

          {/* 4. Uso da plataforma */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              4. Uso da Plataforma
            </h3>
            <p>É permitido utilizar o Eleva para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Registrar medidas corporais, fotos e metas pessoais;</li>
              <li>
                Acompanhar sua evolução e, quando disponível, interagir com
                profissionais;
              </li>
              <li>Visualizar relatórios, gráficos e estatísticas gerados.</li>
            </ul>
            <p>É proibido, entre outros:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Utilizar a plataforma para atividades ilícitas ou abusivas;</li>
              <li>Enviar conteúdos ofensivos, discriminatórios ou ilegais;</li>
              <li>Tentar burlar segurança ou explorar vulnerabilidades;</li>
              <li>Utilizar conta de terceiros sem autorização.</li>
            </ul>
          </div>

          {/* 5. Informação de saúde */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              5. Informações de Saúde e Isenção de Responsabilidade
            </h3>
            <p>
              O Eleva não presta serviços médicos. Qualquer informação apresentada,
              incluindo métricas, gráficos ou comentários de profissionais, possui
              caráter informativo e não substitui orientação médica ou de outros
              profissionais de saúde.
            </p>
            <p>
              Antes de iniciar qualquer plano de treino, dieta ou mudança relevante
              em sua rotina, consulte um profissional qualificado. Você utiliza o
              Eleva por sua conta e risco, sem garantia de resultados específicos
              (ganho de massa, emagrecimento etc.).
            </p>
          </div>

          {/* 6. Conteúdo do usuário */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              6. Conteúdos do Usuário (Medidas, Fotos e Dados)
            </h3>
            <p>
              Ao registrar medidas, fotos de evolução ou outras informações, você
              declara que:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Os dados dizem respeito a você ou têm autorização do titular;</li>
              <li>Não há violação de direitos de imagem ou privacidade;</li>
              <li>
                O conteúdo não é ofensivo, discriminatório ou inadequado.
              </li>
            </ul>
            <p>
              Você mantém a titularidade sobre seus dados, mas autoriza o Eleva a
              armazená-los e processá-los para funcionamento da plataforma, de acordo
              com estes Termos e com a Política de Privacidade.
            </p>
          </div>

          {/* 7. Suspensão/encerramento */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              7. Suspensão e Encerramento
            </h3>
            <p>
              Poderemos suspender ou encerrar o acesso à sua conta em caso de
              violação destes Termos, suspeita de fraude, uso indevido da plataforma
              ou por requisição de autoridades competentes.
            </p>
            <p>
              Você também pode solicitar o encerramento voluntário de sua conta
              pelos canais disponibilizados.
            </p>
          </div>

          {/* 8. Propriedade intelectual */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              8. Propriedade Intelectual
            </h3>
            <p>
              Marca, logotipos, layout, código-fonte e demais elementos da plataforma
              são de titularidade do Eleva ou de seus licenciadores. É proibida a
              reprodução ou exploração não autorizada de qualquer parte do sistema.
            </p>
          </div>

          {/* 9. Alterações */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              9. Alterações destes Termos
            </h3>
            <p>
              Podemos atualizar estes Termos de Uso a qualquer momento. Quando
              houver alterações relevantes, poderemos notificá-lo por e-mail, dentro
              do app ou por outros canais. A continuidade de uso da plataforma
              implica concordância com a versão vigente.
            </p>
          </div>
        </section>

        {/* Divider visual */}
        <div className="h-px w-full bg-border/60" />

        {/* ===================================== */}
        {/*       POLÍTICA DE PRIVACIDADE         */}
        {/* ===================================== */}
        <section
          id="politica-de-privacidade"
          className="space-y-6 text-sm leading-relaxed text-muted-foreground"
        >
          <h2 className="text-xl font-semibold text-foreground">
            Política de Privacidade
          </h2>

          {/* 1. Visão geral */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              1. Visão Geral
            </h3>
            <p>
              Esta Política de Privacidade explica como o Eleva coleta, utiliza,
              armazena e protege seus dados pessoais quando você utiliza a
              plataforma para registrar sua evolução física.
            </p>
            <p>
              Ao utilizar o Eleva, você declara estar ciente e de acordo com o
              tratamento de dados descrito nesta política.
            </p>
          </div>

          {/* 2. Dados coletados */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              2. Dados que Podemos Coletar
            </h3>
            <p>Em geral, poderemos coletar:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <span className="font-medium text-foreground">Dados de conta:</span>{" "}
                nome, e-mail, senha (armazenada de forma criptografada), tipo de
                acesso (usuário, profissional, admin).
              </li>
              <li>
                <span className="font-medium text-foreground">Dados de evolução:</span>{" "}
                medidas corporais, peso, altura, metas, mensagens e observações.
              </li>
              <li>
                <span className="font-medium text-foreground">Fotos de progresso:</span>{" "}
                imagens enviadas por você para acompanhar sua evolução física.
              </li>
              <li>
                <span className="font-medium text-foreground">Dados técnicos:</span>{" "}
                endereço IP, tipo de dispositivo, navegador e dados de uso básicos
                da aplicação (para melhoria e segurança).
              </li>
            </ul>
          </div>

          {/* 3. Finalidades */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              3. Finalidades do Uso dos Dados
            </h3>
            <p>Utilizamos seus dados, principalmente, para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Permitir seu login e gerenciamento da conta;</li>
              <li>Registrar e exibir suas medidas, fotos e metas;</li>
              <li>Gerar gráficos, relatórios e estatísticas de evolução;</li>
              <li>
                Melhorar a experiência de uso, interface e desempenho da
                plataforma;
              </li>
              <li>Garantir segurança, prevenção a fraudes e uso indevido.</li>
            </ul>
          </div>

          {/* 4. Compartilhamento */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              4. Compartilhamento de Dados
            </h3>
            <p>
              Não vendemos seus dados pessoais. Podemos compartilhar informações
              apenas:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Com prestadores de serviço de infraestrutura (por exemplo,
                provedores de armazenamento em nuvem), apenas na medida
                necessária para operação da plataforma;
              </li>
              <li>
                Com profissionais vinculados à sua conta (quando você utilizar
                recursos de acompanhamento profissional), de forma controlada;
              </li>
              <li>
                Quando exigido por lei, ordem judicial ou autoridades
                competentes.
              </li>
            </ul>
          </div>

          {/* 5. Armazenamento e segurança */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              5. Armazenamento e Segurança
            </h3>
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados
              contra acessos não autorizados, perda, uso indevido ou divulgação
              indevida. Ainda assim, nenhum sistema é 100% isento de riscos.
            </p>
            <p>
              As fotos e arquivos enviados podem ser armazenados em serviços de
              terceiros especializados em armazenamento seguro, sempre com
              controle de acesso restrito.
            </p>
          </div>

          {/* 6. Seus direitos */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              6. Seus Direitos em Relação aos Dados
            </h3>
            <p>De acordo com a legislação aplicável, você pode ter direito a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acessar os dados pessoais que mantemos sobre você;</li>
              <li>Solicitar correção de dados incompletos ou desatualizados;</li>
              <li>
                Solicitar exclusão de determinados registros, quando possível;
              </li>
              <li>
                Revisar configurações de conta e, se desejar, encerrar o uso da
                plataforma.
              </li>
            </ul>
            <p>
              Para exercer seus direitos, você pode utilizar os canais de contato
              disponíveis na própria plataforma.
            </p>
          </div>

          {/* 7. Cookies */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              7. Cookies e Tecnologias Semelhantes
            </h3>
            <p>
              Podemos utilizar cookies e tecnologias semelhantes para manter você
              autenticado, salvar preferências e coletar dados de uso agregados
              para melhorias de interface e desempenho.
            </p>
            <p>
              Você pode gerenciar cookies nas configurações do seu navegador,
              lembrando que desativá-los pode afetar o funcionamento de algumas
              funcionalidades.
            </p>
          </div>

          {/* 8. Atualizações */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              8. Atualizações desta Política
            </h3>
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente.
              Sempre que houver alterações relevantes, poderemos notificá-lo por
              e-mail, dentro do app ou em avisos na própria plataforma.
            </p>
          </div>

          {/* 9. Contato */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              9. Contato
            </h3>
            <p>
              Em caso de dúvidas sobre estes Termos de Uso ou sobre a Política de
              Privacidade, entre em contato pelos canais de suporte do Eleva.
            </p>
          </div>

        </section>

        {/* Voltar / navegação */}
        <footer className="pt-4 border-t border-border/60 mt-4 text-xs sm:text-sm text-muted-foreground flex items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Eleva</span>
          <Link
            href="/"
            className="text-primary underline-offset-4 hover:underline"
          >
            Voltar para a página inicial
          </Link>
        </footer>
      </div>
    </main>
  );
}
