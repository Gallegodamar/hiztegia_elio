import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useAddSynonym } from '../../hooks/useAddSynonym';

export const AddSynonymPanel: React.FC = () => {
  const { username, showNotice } = useAppContext();
  const form = useAddSynonym();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const notice = await form.submit(username);
    if (notice) showNotice(notice);
  };

  return (
    <section className="surface-card p-4 md:p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="status-copy">
          Hitz berria sinonimoen hiztegian gehitu (beti <strong>1. mailan</strong>).
        </p>
        <p className="helper-note">
          Sistemak automatikoki egiaztatzen du hitza jada badagoen sinonimoen hiztegi osoan.
        </p>

        <label className="block">
          <span className="field-label">Hitza</span>
          <input
            type="text"
            value={form.word}
            onChange={(e) => form.setWord(e.target.value)}
            placeholder="Adib. dagoeneko"
            className="input-shell"
            required
          />
        </label>

        <label className="block">
          <span className="field-label">Sinonimoak</span>
          <textarea
            value={form.synonymList}
            onChange={(e) => form.setSynonymList(e.target.value)}
            placeholder="Adib. jadanik, honezkero, dagoenez"
            className="input-shell min-h-24 resize-y"
            required
          />
          <p className="helper-note mt-1">Banandu komaz, puntu eta komaz edo lerro-jauziez.</p>
        </label>

        {form.error ? <p className="notice notice--error">{form.error}</p> : null}

        <button
          type="submit"
          disabled={form.isSubmitting}
          className="btn-primary w-full py-3 text-sm"
        >
          {form.isSubmitting ? 'Gordetzen...' : 'Sinonimoa gehitu'}
        </button>
      </form>
    </section>
  );
};
