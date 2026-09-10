import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Estado do caso ativo e dos artefatos da sessão de trabalho.
 * Substitui o `useJobStore` do RecrutaAI.
 *
 * ATENÇÃO: nada de conteúdo de documento de cliente é persistido aqui.
 * localStorage não é lugar de material coberto por sigilo profissional —
 * só ficam identificadores e o texto da minuta em edição, que o usuário
 * pode limpar a qualquer momento.
 */
export const useCaseStore = create(
    persist(
        (set) => ({
            casoAtivoId: null,
            casoAtivo: null,
            ultimaAnaliseId: null,
            minutaEmEdicao: null,

            setCasoAtivo: (caso) => set({ casoAtivo: caso, casoAtivoId: caso?.id || null }),
            setUltimaAnalise: (id) => set({ ultimaAnaliseId: id }),
            setMinuta: (minuta) => set({ minutaEmEdicao: minuta }),
            limparMinuta: () => set({ minutaEmEdicao: null }),
            limparCaso: () => set({ casoAtivo: null, casoAtivoId: null, ultimaAnaliseId: null, minutaEmEdicao: null })
        }),
        {
            name: "juridico-ia-sessao",
            partialize: (state) => ({
                casoAtivoId: state.casoAtivoId,
                casoAtivo: state.casoAtivo ? { id: state.casoAtivo.id, titulo: state.casoAtivo.titulo, area: state.casoAtivo.area } : null,
                ultimaAnaliseId: state.ultimaAnaliseId
            })
        }
    )
);
