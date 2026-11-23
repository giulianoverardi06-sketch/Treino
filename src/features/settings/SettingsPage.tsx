import { useLiveQuery } from 'dexie-react-hooks';
import { FileDown, FileSpreadsheet, FileUp, Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/Button';
import { buttonClass } from '@/components/buttonStyles';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { Segmented } from '@/components/PeriodFilter';
import { useToast } from '@/components/Toast';
import { DEFAULT_SETTINGS } from '@/data/seedProgram';
import { clearAllData, exportBackup, importBackup, markBackedUp } from '@/db/backupRepo';
import { db } from '@/db/db';
import {
  backupFileName,
  parseBackup,
  setLogsToCsv,
  summarizeBackup,
  type Backup,
} from '@/domain/backup';
import { stepWeight } from '@/domain/sessionRows';
import type { Settings, Theme } from '@/domain/types';
import { useDraftStore } from '@/features/session/draftStore';
import { blobToText } from '@/lib/blob';
import { downloadFile } from '@/lib/download';
import { formatKg, formatLongDate, formatNumber, formatTime } from '@/lib/format';

const THEMES = [
  { value: 'dark', label: 'Escuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
] as const satisfies readonly { value: Theme; label: string }[];

async function saveSettings(patch: Partial<Settings>) {
  await db.settings.update('singleton', patch);
}

async function downloadBackup(includeImages: boolean, prefix?: string) {
  const backup = await exportBackup({ includeImages });
  const now = new Date();
  downloadFile(backupFileName(now, prefix), JSON.stringify(backup), 'application/json');
  return now;
}

function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <span>
        <span className="block text-base font-semibold">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="size-6 shrink-0 accent-current"
      />
    </label>
  );
}

type Pending =
  { kind: 'import'; backup: Backup; fileName: string } | { kind: 'wipe'; step: 1 | 2 } | null;

export function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get('singleton')) ?? DEFAULT_SETTINGS;
  const navigate = useNavigate();
  const toast = useToast();
  const [withImages, setWithImages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [wipeText, setWipeText] = useState('');

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : 'Algo deu errado.' });
    } finally {
      setBusy(false);
    }
  }

  async function exportNow() {
    await run(async () => {
      const when = await downloadBackup(withImages);
      await markBackedUp(when);
      toast({ message: 'Backup exportado' });
    });
  }

  async function exportCsv() {
    await run(async () => {
      const [sessions, setLogs, exercises] = await Promise.all([
        db.sessions.toArray(),
        db.setLogs.toArray(),
        db.exercises.toArray(),
      ]);
      const csv = setLogsToCsv(sessions, setLogs, new Map(exercises.map((e) => [e.id, e.name])));
      downloadFile(
        backupFileName(new Date(), 'treino-historico').replace('.json', '.csv'),
        csv,
        'text/csv;charset=utf-8',
      );
    });
  }

  async function pickFile(file: File) {
    const parsed = parseBackup(await blobToText(file));
    if (!parsed.ok) {
      toast({ message: parsed.error });
      return;
    }
    setPending({ kind: 'import', backup: parsed.backup, fileName: file.name });
  }

  async function confirmImport(backup: Backup) {
    await run(async () => {
      // Antes de substituir, guarda o estado atual (SPEC §5.8).
      await downloadBackup(true, 'treino-antes-de-importar');
      await importBackup(backup);
      useDraftStore.setState({ drafts: {} });
      setPending(null);
      toast({ message: 'Backup importado' });
      void navigate('/', { replace: true });
    });
  }

  async function confirmWipe() {
    await run(async () => {
      await clearAllData();
      useDraftStore.setState({ drafts: {} });
      setPending(null);
      setWipeText('');
      toast({ message: 'Dados apagados. O programa inicial foi restaurado.' });
      void navigate('/', { replace: true });
    });
  }

  const summary = pending?.kind === 'import' ? summarizeBackup(pending.backup) : null;

  return (
    <>
      <PageHeader title="Configurações" backTo="/" />

      <div className="flex flex-col gap-8">
        <section aria-labelledby="theme-title">
          <h2 id="theme-title" className="mb-2 text-lg font-extrabold">
            Tema
          </h2>
          <Segmented
            label="Tema"
            value={settings.theme}
            options={THEMES}
            onChange={(theme) => void saveSettings({ theme })}
          />
          <p className="mt-1 text-sm text-muted">
            “Sistema” acompanha o modo claro/escuro do aparelho.
          </p>
        </section>

        <section aria-labelledby="training-title">
          <h2 id="training-title" className="mb-2 text-lg font-extrabold">
            Treino
          </h2>
          <div className="rounded-[4px] border-2 border-edge bg-surface px-3">
            <Switch
              label="Série até a falha por padrão"
              hint="Como cada série nova começa marcada."
              checked={settings.defaultToFailure}
              onChange={(v) => void saveSettings({ defaultToFailure: v })}
            />
            <Switch
              label="Manter a tela acesa"
              hint="Durante a sessão, quando o aparelho permite."
              checked={settings.wakeLock}
              onChange={(v) => void saveSettings({ wakeLock: v })}
            />
            <div className="flex min-h-14 items-center justify-between gap-4 py-2">
              <span>
                <span className="block text-base font-semibold" id="drop-label">
                  Redução do “reduzir”
                </span>
                <span className="block text-sm text-muted">Protocolo da elevação lateral.</span>
              </span>
              <div
                className="flex shrink-0 items-center rounded-[3px] border-2 border-edge"
                role="group"
                aria-labelledby="drop-label"
              >
                <button
                  type="button"
                  aria-label="Diminuir redução"
                  disabled={settings.lateralDropKg <= 0.5}
                  className="flex size-11 items-center justify-center disabled:opacity-30"
                  onClick={() =>
                    void saveSettings({
                      lateralDropKg: stepWeight(settings.lateralDropKg, 0.5, -1),
                    })
                  }
                >
                  <Minus aria-hidden size={18} strokeWidth={2.5} />
                </button>
                <span className="w-16 text-center text-lg font-bold num" aria-live="polite">
                  {formatKg(settings.lateralDropKg)}
                </span>
                <button
                  type="button"
                  aria-label="Aumentar redução"
                  disabled={settings.lateralDropKg >= 10}
                  className="flex size-11 items-center justify-center disabled:opacity-30"
                  onClick={() =>
                    void saveSettings({ lateralDropKg: stepWeight(settings.lateralDropKg, 0.5, 1) })
                  }
                >
                  <Plus aria-hidden size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="backup-title">
          <h2 id="backup-title" className="mb-1 text-lg font-extrabold">
            Backup
          </h2>
          <p className="mb-3 text-sm text-muted">
            {settings.lastBackupAt
              ? `Último backup: ${formatLongDate(settings.lastBackupAt)}, ${formatTime(settings.lastBackupAt)}.`
              : 'Nenhum backup feito ainda.'}{' '}
            Tudo fica só neste aparelho; o backup é a sua cópia.
          </p>
          <div className="flex flex-col gap-2">
            <label className="flex min-h-11 items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={withImages}
                onChange={(e) => {
                  setWithImages(e.target.checked);
                }}
                className="size-5 accent-current"
              />
              Incluir fotos próprias (arquivo maior)
            </label>
            <Button
              variant="solid"
              icon={FileDown}
              disabled={busy}
              onClick={() => void exportNow()}
            >
              Exportar backup
            </Button>
            <label
              className={buttonClass(
                'outline',
                `cursor-pointer has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus ${busy ? 'pointer-events-none opacity-40' : ''}`,
              )}
            >
              <FileUp aria-hidden size={20} strokeWidth={2.25} />
              <span>Importar backup</span>
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void pickFile(file);
                }}
              />
            </label>
            <Button
              variant="outline"
              icon={FileSpreadsheet}
              disabled={busy}
              onClick={() => void exportCsv()}
            >
              Exportar histórico (CSV)
            </Button>
          </div>
        </section>

        <section aria-labelledby="danger-title" className="mt-4 border-t border-border pt-6">
          <h2 id="danger-title" className="mb-1 text-lg font-extrabold">
            Apagar todos os dados
          </h2>
          <p className="mb-3 text-sm text-muted">
            Apaga sessões, séries, fotos e mudanças no programa, e volta ao programa inicial.
          </p>
          <Button
            variant="outline"
            icon={Trash2}
            className="w-full"
            disabled={busy}
            onClick={() => {
              setPending({ kind: 'wipe', step: 1 });
            }}
          >
            Apagar todos os dados
          </Button>
        </section>

        <footer className="border-t border-border pt-4 pb-2 text-sm text-muted">
          <p className="font-semibold text-text">Sobre</p>
          <p>Treino ABC. Dados guardados só neste aparelho.</p>
          <p>Imagens: free-exercise-db (domínio público)</p>
        </footer>
      </div>

      {pending?.kind === 'import' && summary && (
        <Modal
          title="Importar backup?"
          onClose={() => {
            setPending(null);
          }}
          footer={
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPending(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="solid"
                className="flex-1"
                disabled={busy}
                onClick={() => void confirmImport(pending.backup)}
              >
                Substituir tudo
              </Button>
            </>
          }
        >
          <p className="mb-3 text-base">{pending.fileName}</p>
          <dl className="mb-3 rounded-[4px] border-2 border-edge bg-surface px-3 num">
            {[
              [
                'Exportado em',
                `${formatLongDate(summary.exportedAt)}, ${formatTime(summary.exportedAt)}`,
              ],
              ['Sessões concluídas', formatNumber(summary.sessions)],
              ['Séries', formatNumber(summary.setLogs)],
              ['Exercícios', formatNumber(summary.exercises)],
              ['Fotos', formatNumber(summary.images)],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-border last:border-b-0"
              >
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="text-base font-bold first-letter:uppercase">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted">
            Tudo o que está no aparelho será substituído. Antes, um backup do estado atual é baixado
            automaticamente.
          </p>
        </Modal>
      )}

      {pending?.kind === 'wipe' && (
        <Modal
          title={pending.step === 1 ? 'Apagar todos os dados?' : 'Confirme para apagar'}
          onClose={() => {
            setPending(null);
            setWipeText('');
          }}
          footer={
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPending(null);
                  setWipeText('');
                }}
              >
                Cancelar
              </Button>
              {pending.step === 1 ? (
                <Button
                  variant="solid"
                  className="flex-1"
                  onClick={() => {
                    setPending({ kind: 'wipe', step: 2 });
                  }}
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  variant="solid"
                  className="flex-1"
                  disabled={busy || wipeText.trim().toLowerCase() !== 'apagar'}
                  onClick={() => void confirmWipe()}
                >
                  Apagar tudo
                </Button>
              )}
            </>
          }
        >
          {pending.step === 1 ? (
            <p className="text-base text-muted">
              Sessões, séries, fotos próprias e mudanças no programa serão apagadas definitivamente.
              Não dá para desfazer. Se quiser guardar, exporte um backup antes.
            </p>
          ) : (
            <label className="block">
              <span className="mb-1 block text-base">
                Digite <strong>apagar</strong> para confirmar.
              </span>
              <input
                value={wipeText}
                onChange={(e) => {
                  setWipeText(e.target.value);
                }}
                autoComplete="off"
                className="h-12 w-full rounded-[3px] border-2 border-edge bg-surface px-3 text-base text-text"
              />
            </label>
          )}
        </Modal>
      )}
    </>
  );
}
