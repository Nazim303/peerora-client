import React, { useState } from 'react';
import { X, BarChart2, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { translations } from '../locales/translations';

export default function PollModal({ 
  isOpen, 
  onClose, 
  poll, 
  onCreatePoll, 
  onVote, 
  onEndPoll, 
  isHost, 
  userId, 
  theme,
  lang = 'tr'
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const t = translations[lang] || translations.tr;

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 5) setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (val, index) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return alert(t.pollValidationAlert);

    onCreatePoll({ question: question.trim(), options: validOptions });
    setQuestion('');
    setOptions(['', '']);
  };

  const totalVotes = poll ? poll.options.reduce((acc, opt) => acc + opt.votes.length, 0) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`${theme.panel} w-full max-w-sm p-4 flex flex-col shadow-2xl max-h-[85vh]`}>
        {/* Başlık */}
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2 font-black text-sm">
            <BarChart2 size={18} /> {t.pollTitle}
          </div>
          <button onClick={onClose} className="cursor-pointer opacity-70 hover:opacity-100">
            <X size={18} />
          </button>
        </div>

        {/* Aktif Anket Varsa Göster */}
        {poll ? (
          <div className="space-y-4 my-3">
            <div className="text-sm font-black">{poll.question}</div>
            <div className="space-y-2">
              {poll.options.map((opt) => {
                const count = opt.votes.length;
                const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const hasVotedThis = opt.votes.includes(userId);

                return (
                  <button
                    key={opt.id}
                    onClick={() => onVote(opt.id)}
                    className={`w-full relative overflow-hidden p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      hasVotedThis
                        ? 'border-blue-500 bg-blue-500/15 font-bold'
                        : 'border-black/10 hover:bg-black/5'
                    }`}
                  >
                    {/* Yüzde İlerleme Çubuğu */}
                    <div
                      className="absolute left-0 top-0 bottom-0 bg-blue-500/20 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-bold">
                        {hasVotedThis && <CheckCircle2 size={14} className="text-blue-500 shrink-0" />}
                        {opt.text}
                      </span>
                      <span className="opacity-80 font-mono">%{percentage} ({count})</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] opacity-70 text-right">{t.totalVotesText}: {totalVotes}</div>

            {isHost && (
              <button
                onClick={onEndPoll}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-xl text-xs font-black cursor-pointer shadow-md transition-all"
              >
                {t.endPollBtn}
              </button>
            )}
          </div>
        ) : (
          /* Yeni Anket Oluşturma Formu */
          <form onSubmit={handleCreate} className="space-y-3 my-3">
            <input
              type="text"
              placeholder={t.pollQuestionPlaceholder}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className={`w-full ${theme.input} text-xs px-3 py-2 outline-none`}
            />

            <div className="space-y-2">
              <label className="text-xs font-bold opacity-80">{t.pollOptionsLabel}</label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder={`${t.pollOptionPlaceholder} ${i + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(e.target.value, i)}
                    className={`flex-1 ${theme.input} text-xs px-3 py-1.5 outline-none`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 5 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs font-bold text-blue-500 flex items-center gap-1 cursor-pointer hover:underline"
              >
                <Plus size={13} /> {t.addOptionBtn}
              </button>
            )}

            <button
              type="submit"
              className={`w-full ${theme.buttonPrimary} py-2 text-xs font-black cursor-pointer shadow-lg`}
            >
              {t.startPollBtn}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}