import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../lib/utils";

// Kana row data is intentionally simple: each selectable row expands into practice cards.
const hiraganaRows = [
   { id: 'h_a', label: 'a i u e o', chars: [ {k:'あ', r:'a'}, {k:'い', r:'i'}, {k:'う', r:'u'}, {k:'え', r:'e'}, {k:'お', r:'o'} ] },
   { id: 'h_k', label: 'ka ki ku ke ko', chars: [ {k:'か', r:'ka'}, {k:'き', r:'ki'}, {k:'く', r:'ku'}, {k:'け', r:'ke'}, {k:'こ', r:'ko'} ] },
   { id: 'h_s', label: 'sa shi su se so', chars: [ {k:'さ', r:'sa'}, {k:'し', r:'shi'}, {k:'す', r:'su'}, {k:'せ', r:'se'}, {k:'そ', r:'so'} ] },
   { id: 'h_t', label: 'ta chi tsu te to', chars: [ {k:'た', r:'ta'}, {k:'ち', r:'chi'}, {k:'つ', r:'tsu'}, {k:'て', r:'te'}, {k:'と', r:'to'} ] },
   { id: 'h_n', label: 'na ni nu ne no', chars: [ {k:'な', r:'na'}, {k:'に', r:'ni'}, {k:'ぬ', r:'nu'}, {k:'ね', r:'ne'}, {k:'の', r:'no'} ] },
   { id: 'h_h', label: 'ha hi fu he ho', chars: [ {k:'は', r:'ha'}, {k:'ひ', r:'hi'}, {k:'ふ', r:'fu'}, {k:'へ', r:'he'}, {k:'ほ', r:'ho'} ] },
   { id: 'h_m', label: 'ma mi mu me mo', chars: [ {k:'ま', r:'ma'}, {k:'み', r:'mi'}, {k:'む', r:'mu'}, {k:'め', r:'me'}, {k:'も', r:'mo'} ] },
   { id: 'h_y', label: 'ya yu yo', chars: [ {k:'や', r:'ya'}, {k:'ゆ', r:'yu'}, {k:'よ', r:'yo'} ] },
   { id: 'h_r', label: 'ra ri ru re ro', chars: [ {k:'ら', r:'ra'}, {k:'り', r:'ri'}, {k:'る', r:'ru'}, {k:'れ', r:'re'}, {k:'ろ', r:'ro'} ] },
   { id: 'h_w', label: 'wa wo n', chars: [ {k:'わ', r:'wa'}, {k:'を', r:'wo'}, {k:'ん', r:'n'} ] },
   { id: 'h_g', label: 'ga gi gu ge go', chars: [ {k:'が', r:'ga'}, {k:'ぎ', r:'gi'}, {k:'ぐ', r:'gu'}, {k:'げ', r:'ge'}, {k:'ご', r:'go'} ] },
   { id: 'h_z', label: 'za ji zu ze zo', chars: [ {k:'ざ', r:'za'}, {k:'じ', r:'ji'}, {k:'ず', r:'zu'}, {k:'ぜ', r:'ze'}, {k:'ぞ', r:'zo'} ] },
   { id: 'h_d', label: 'da dji dzu de do', chars: [ {k:'だ', r:'da'}, {k:'ぢ', r:'dji'}, {k:'づ', r:'dzu'}, {k:'で', r:'de'}, {k:'ど', r:'do'} ] },
   { id: 'h_b', label: 'ba bi bu be bo', chars: [ {k:'ば', r:'ba'}, {k:'び', r:'bi'}, {k:'ぶ', r:'bu'}, {k:'べ', r:'be'}, {k:'ぼ', r:'bo'} ] },
   { id: 'h_p', label: 'pa pi pu pe po', chars: [ {k:'ぱ', r:'pa'}, {k:'ぴ', r:'pi'}, {k:'ぷ', r:'pu'}, {k:'ぺ', r:'pe'}, {k:'ぽ', r:'po'} ] },
   { id: 'h_ky', label: 'kya kyu kyo', chars: [ {k:'きゃ', r:'kya'}, {k:'きゅ', r:'kyu'}, {k:'きょ', r:'kyo'} ] },
   { id: 'h_sh', label: 'sha shu sho', chars: [ {k:'しゃ', r:'sha'}, {k:'しゅ', r:'shu'}, {k:'しょ', r:'sho'} ] },
   { id: 'h_ch', label: 'cha chu cho', chars: [ {k:'ちゃ', r:'cha'}, {k:'ちゅ', r:'chu'}, {k:'ちょ', r:'cho'} ] },
   { id: 'h_ny', label: 'nya nyu nyo', chars: [ {k:'にゃ', r:'nya'}, {k:'にゅ', r:'nyu'}, {k:'にょ', r:'nyo'} ] },
   { id: 'h_hy', label: 'hya hyu hyo', chars: [ {k:'ひゃ', r:'hya'}, {k:'ひゅ', r:'hyu'}, {k:'ひょ', r:'hyo'} ] },
   { id: 'h_my', label: 'mya myu myo', chars: [ {k:'みゃ', r:'mya'}, {k:'みゅ', r:'myu'}, {k:'みょ', r:'myo'} ] },
   { id: 'h_ry', label: 'rya ryu ryo', chars: [ {k:'りゃ', r:'rya'}, {k:'りゅ', r:'ryu'}, {k:'りょ', r:'ryo'} ] },
   { id: 'h_gy', label: 'gya gyu gyo', chars: [ {k:'ぎゃ', r:'gya'}, {k:'ぎゅ', r:'gyu'}, {k:'ぎょ', r:'gyo'} ] },
   { id: 'h_j', label: 'ja ju jo', chars: [ {k:'じゃ', r:'ja'}, {k:'じゅ', r:'ju'}, {k:'じょ', r:'jo'} ] },
   { id: 'h_by', label: 'bya byu byo', chars: [ {k:'びゃ', r:'bya'}, {k:'びゅ', r:'byu'}, {k:'びょ', r:'byo'} ] },
   { id: 'h_py', label: 'pya pyu pyo', chars: [ {k:'ぴゃ', r:'pya'}, {k:'ぴゅ', r:'pyu'}, {k:'ぴょ', r:'pyo'} ] },
];

const katakanaRows = [
   { id: 'k_a', label: 'a i u e o', chars: [ {k:'ア', r:'a'}, {k:'イ', r:'i'}, {k:'ウ', r:'u'}, {k:'エ', r:'e'}, {k:'オ', r:'o'} ] },
   { id: 'k_k', label: 'ka ki ku ke ko', chars: [ {k:'カ', r:'ka'}, {k:'キ', r:'ki'}, {k:'ク', r:'ku'}, {k:'ケ', r:'ke'}, {k:'コ', r:'ko'} ] },
   { id: 'k_s', label: 'sa shi su se so', chars: [ {k:'サ', r:'sa'}, {k:'シ', r:'shi'}, {k:'ス', r:'su'}, {k:'セ', r:'se'}, {k:'ソ', r:'so'} ] },
   { id: 'k_t', label: 'ta chi tsu te to', chars: [ {k:'タ', r:'ta'}, {k:'チ', r:'chi'}, {k:'ツ', r:'tsu'}, {k:'テ', r:'te'}, {k:'ト', r:'to'} ] },
   { id: 'k_n', label: 'na ni nu ne no', chars: [ {k:'ナ', r:'na'}, {k:'ニ', r:'ni'}, {k:'ヌ', r:'nu'}, {k:'ネ', r:'ne'}, {k:'ノ', r:'no'} ] },
   { id: 'k_h', label: 'ha hi fu he ho', chars: [ {k:'ハ', r:'ha'}, {k:'ヒ', r:'hi'}, {k:'フ', r:'fu'}, {k:'ヘ', r:'he'}, {k:'ホ', r:'ho'} ] },
   { id: 'k_m', label: 'ma mi mu me mo', chars: [ {k:'マ', r:'ma'}, {k:'ミ', r:'mi'}, {k:'ム', r:'mu'}, {k:'メ', r:'me'}, {k:'モ', r:'mo'} ] },
   { id: 'k_y', label: 'ya yu yo', chars: [ {k:'ヤ', r:'ya'}, {k:'ユ', r:'yu'}, {k:'ヨ', r:'yo'} ] },
   { id: 'k_r', label: 'ra ri ru re ro', chars: [ {k:'ラ', r:'ra'}, {k:'リ', r:'ri'}, {k:'ル', r:'ru'}, {k:'レ', r:'re'}, {k:'ロ', r:'ro'} ] },
   { id: 'k_w', label: 'wa wo n', chars: [ {k:'ワ', r:'wa'}, {k:'ヲ', r:'wo'}, {k:'ン', r:'n'} ] },
   { id: 'k_g', label: 'ga gi gu ge go', chars: [ {k:'ガ', r:'ga'}, {k:'ギ', r:'gi'}, {k:'グ', r:'gu'}, {k:'ゲ', r:'ge'}, {k:'ゴ', r:'go'} ] },
   { id: 'k_z', label: 'za ji zu ze zo', chars: [ {k:'ザ', r:'za'}, {k:'ジ', r:'ji'}, {k:'ズ', r:'zu'}, {k:'ゼ', r:'ze'}, {k:'ゾ', r:'zo'} ] },
   { id: 'k_d', label: 'da dji dzu de do', chars: [ {k:'ダ', r:'da'}, {k:'ヂ', r:'dji'}, {k:'ヅ', r:'dzu'}, {k:'デ', r:'de'}, {k:'ド', r:'do'} ] },
   { id: 'k_b', label: 'ba bi bu be bo', chars: [ {k:'バ', r:'ba'}, {k:'ビ', r:'bi'}, {k:'ブ', r:'bu'}, {k:'ベ', r:'be'}, {k:'ボ', r:'bo'} ] },
   { id: 'k_p', label: 'pa pi pu pe po', chars: [ {k:'パ', r:'pa'}, {k:'ピ', r:'pi'}, {k:'プ', r:'pu'}, {k:'ペ', r:'pe'}, {k:'ポ', r:'po'} ] },
   { id: 'k_ky', label: 'kya kyu kyo', chars: [ {k:'キャ', r:'kya'}, {k:'キュ', r:'kyu'}, {k:'キョ', r:'kyo'} ] },
   { id: 'k_sh', label: 'sha shu sho', chars: [ {k:'シャ', r:'sha'}, {k:'シュ', r:'shu'}, {k:'ショ', r:'sho'} ] },
   { id: 'k_ch', label: 'cha chu cho', chars: [ {k:'チャ', r:'cha'}, {k:'チュ', r:'chu'}, {k:'チョ', r:'cho'} ] },
   { id: 'k_ny', label: 'nya nyu nyo', chars: [ {k:'ニャ', r:'nya'}, {k:'ニュ', r:'nyu'}, {k:'ニョ', r:'nyo'} ] },
   { id: 'k_hy', label: 'hya hyu hyo', chars: [ {k:'ヒャ', r:'hya'}, {k:'ヒュ', r:'hyu'}, {k:'ヒョ', r:'hyo'} ] },
   { id: 'k_my', label: 'mya myu myo', chars: [ {k:'ミャ', r:'mya'}, {k:'ミュ', r:'myu'}, {k:'ミョ', r:'myo'} ] },
   { id: 'k_ry', label: 'rya ryu ryo', chars: [ {k:'リャ', r:'rya'}, {k:'リュ', r:'ryu'}, {k:'リョ', r:'ryo'} ] },
   { id: 'k_gy', label: 'gya gyu gyo', chars: [ {k:'ギャ', r:'gya'}, {k:'ギュ', r:'gyu'}, {k:'ギョ', r:'gyo'} ] },
   { id: 'k_j', label: 'ja ju jo', chars: [ {k:'ジャ', r:'ja'}, {k:'ジュ', r:'ju'}, {k:'ジョ', r:'jo'} ] },
   { id: 'k_by', label: 'bya byu byo', chars: [ {k:'ビャ', r:'bya'}, {k:'ビュ', r:'byu'}, {k:'ビョ', r:'byo'} ] },
   { id: 'k_py', label: 'pya pyu pyo', chars: [ {k:'ピャ', r:'pya'}, {k:'ピュ', r:'pyu'}, {k:'ピョ', r:'pyo'} ] },
   { id: 'k_ext_w', label: 'wi we wo', chars: [ {k:'ウィ', r:'wi'}, {k:'ウェ', r:'we'}, {k:'ウォ', r:'wo'} ] },
   { id: 'k_ext_v', label: 'va vi vu ve vo', chars: [ {k:'ヴァ', r:'va'}, {k:'ヴィ', r:'vi'}, {k:'ヴ', r:'vu'}, {k:'ヴェ', r:'ve'}, {k:'ヴォ', r:'vo'} ] },
   { id: 'k_ext_sh_j_ch', label: 'she je che', chars: [ {k:'シェ', r:'she'}, {k:'ジェ', r:'je'}, {k:'チェ', r:'che'} ] },
   { id: 'k_ext_ts', label: 'tsa tsi tse tso', chars: [ {k:'ツァ', r:'tsa'}, {k:'ツィ', r:'tsi'}, {k:'ツェ', r:'tse'}, {k:'ツォ', r:'tso'} ] },
   { id: 'k_ext_t_d', label: 'ti tu di du', chars: [ {k:'ティ', r:'ti'}, {k:'トゥ', r:'tu'}, {k:'ディ', r:'di'}, {k:'ドゥ', r:'du'} ] },
   { id: 'k_ext_f', label: 'fa fi fe fo', chars: [ {k:'ファ', r:'fa'}, {k:'フィ', r:'fi'}, {k:'フェ', r:'fe'}, {k:'フォ', r:'fo'} ] },
   { id: 'k_ext_y', label: 'fyu tyu dyu', chars: [ {k:'フュ', r:'fyu'}, {k:'テュ', r:'tyu'}, {k:'デュ', r:'dyu'} ] },
   { id: 'k_ext_kw_gw', label: 'kwa kwe kwo gwa', chars: [ {k:'クァ', r:'kwa'}, {k:'クェ', r:'kwe'}, {k:'クォ', r:'kwo'}, {k:'グァ', r:'gwa'} ] },
];

export function KanaPractice() {
   // A Set prevents the same kana row from being selected more than once.
   const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
   const [autoSubmit, setAutoSubmit] = useState(false);
   const [isStudying, setIsStudying] = useState(false);
   const [studyList, setStudyList] = useState<{k: string, r: string}[]>([]);
   const [currentIndex, setCurrentIndex] = useState(0);
   const [inputValue, setInputValue] = useState("");
   const [isWrong, setIsWrong] = useState(false);
   const [isFinished, setIsFinished] = useState(false);
      
   const inputRef = useRef<HTMLInputElement>(null);
         
   const toggleRow = (id: string) => {
      const newSelected = new Set(selectedRows);
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      setSelectedRows(newSelected);
   };
         
   const toggleAll = (type: 'hiragana' | 'katakana') => {
      const rows = type === 'hiragana' ? hiraganaRows : katakanaRows;
      const newSelected = new Set(selectedRows);
      const allSelected = rows.every(r => newSelected.has(r.id));
      
      if (allSelected) {
         rows.forEach(r => newSelected.delete(r.id));
      } else {
         rows.forEach(r => newSelected.add(r.id));
      }
      setSelectedRows(newSelected);
   };

   const advanceCard = () => {
      if (currentIndex < studyList.length - 1) {
         setCurrentIndex(prev => prev + 1);
         setInputValue("");
      } else {
         setIsFinished(true);
      }
   };
         
   const startStudy = () => {
      if (selectedRows.size === 0) return;
      
      // Build the session from selected rows, then shuffle so practice order changes each time.
      const allSelectedChars = [...hiraganaRows, ...katakanaRows]
      .filter(r => selectedRows.has(r.id))
      .flatMap(r => r.chars);
      
      // Shuffle
      for (let i = allSelectedChars.length - 1; i > 0; i--) {
         const j = Math.floor(Math.random() * (i + 1));
         [allSelectedChars[i], allSelectedChars[j]] = [allSelectedChars[j], allSelectedChars[i]];
      }
      
      setStudyList(allSelectedChars);
      setCurrentIndex(0);
      setIsStudying(true);
      setIsFinished(false);
      setInputValue("");
      setIsWrong(false);
      
      setTimeout(() => inputRef.current?.focus(), 100);
   };
         
   const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.toLowerCase().trim();
      setInputValue(val);
      setIsWrong(false);
      
      const currentKana = studyList[currentIndex];
      if (autoSubmit && currentKana && val === currentKana.r) {
         advanceCard();
      }
   };
   
   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
         const currentKana = studyList[currentIndex];
         if (inputValue === currentKana.r) {
            advanceCard();
         } else {
            // Wrong answers briefly flash red, then reset so the learner can try again.
            setIsWrong(true);
            setTimeout(() => {
               setInputValue("");
               setIsWrong(false);
            }, 500); // Clear input after brief flash
         }
      }
   };
         
         if (isFinished) {
            // Completion screen after the final kana in the current session.
            return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto w-full text-center space-y-6">
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 bg-brand/20 rounded-full flex items-center justify-center text-brand">
                  <CheckCircle2 className="w-12 h-12" />
               </motion.div>
               <h2 className="text-4xl font-extrabold text-ink">おめでとう！</h2>
               <p className="text-ink-muted text-lg">You've completed all {studyList.length} kana characters.</p>
               
               <div className="flex items-center gap-4 mt-8">
                  <button 
                     onClick={() => { setIsStudying(false); setIsFinished(false); }}
                     className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-bold hover:bg-page transition-all shadow-sm"
                  >
                     Change Selection
                  </button>
                  <button 
                     onClick={startStudy}
                     className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20"
                  >
                     <RotateCcw className="w-5 h-5" /> Study Again
                  </button>
               </div>
            </div>
      );
   }
   
   if (isStudying) {
      // Active drill screen. The input stays focused so repeated typing is fast.
      const currentKana = studyList[currentIndex];
      const progress = ((currentIndex) / studyList.length) * 100;
      
      return (
         <div className="max-w-2xl mx-auto w-full pt-10">
            <div className="flex items-center justify-between mb-8">
               <button 
                  onClick={() => setIsStudying(false)}
                  className="flex items-center gap-2 text-ink-muted hover:text-ink font-medium transition-colors"
               >
                  <ArrowLeft className="w-5 h-5" /> Back
               </button>
               <div className="text-sm font-bold text-ink-muted">
                  {currentIndex + 1} / {studyList.length}
               </div>
            </div>
         
            <div className="w-full bg-border-hiyori rounded-full h-2 overflow-hidden mb-12">
               <div className="bg-brand h-2 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
         
            <div className="flex flex-col items-center">
               <AnimatePresence mode="wait">
                  <motion.div 
                     key={currentKana.k}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -20 }}
                     transition={{ duration: 0.2 }}
                     className="text-[120px] font-black text-ink leading-none mb-12"
                  >
                     {currentKana.k}
                  </motion.div>
               </AnimatePresence>
         
               <div className="relative w-64">
                  <input
                     ref={inputRef}
                     type="text"
                     value={inputValue}
                     onChange={handleInput}
                     onKeyDown={handleKeyDown}
                     placeholder="romaji..."
                     className={cn(
                     "w-full text-center text-3xl font-bold px-6 py-4 bg-surface border-2 rounded-2xl shadow-sm outline-none transition-all placeholder:text-ink-faint placeholder:font-medium placeholder:text-2xl",
                     isWrong 
                     ? "border-red-500 text-red-500 bg-red-50 shake" 
                     : "border-border-hiyori text-ink focus:border-brand focus:ring-4 focus:ring-brand/10"
                     )}
                     autoFocus
                     autoComplete="off"
                  />
                  {isWrong && <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />}
               </div>
               <p className="text-ink-muted mt-6 text-sm font-medium">Type the romaji and press Enter</p>
            </div>
         </div>
      );
   }

   // Selection screen shown before a study session starts.
   return (
      <div className="space-y-10 font-sans max-w-5xl mx-auto w-full pb-20">
         {/* Header */}
         <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
         >
            <div>
               <Link to="/" className="inline-flex items-center gap-2 text-ink-muted hover:text-brand font-medium transition-colors mb-2 text-sm">
                  <ArrowLeft className="w-4 h-4" /> Home
               </Link>
               <h1 className="text-4xl font-extrabold text-ink tracking-tight">Kana Practice</h1>
               <p className="text-ink-muted mt-2 text-lg">Select the columns you want to review.</p>
            </div>
         
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
               <button
                  type="button"
                  onClick={() => setAutoSubmit(prev => !prev)}
                  aria-pressed={autoSubmit}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border-hiyori bg-surface text-ink font-bold hover:bg-page transition-all shadow-sm min-w-52.5"
               >
                  <span className="flex flex-col items-start leading-tight">
                     <span className="text-sm">Auto-submit</span>
                     <span className="text-xs font-medium text-ink-muted">Advance on correct romaji</span>
                  </span>
                  <span className={cn(
                     "relative h-6 w-11 rounded-full transition-colors",
                     autoSubmit ? "bg-brand" : "bg-border-hiyori"
                  )}>
                     <span className={cn(
                        "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-surface shadow-sm transition-all",
                        autoSubmit ? "left-6" : "left-1"
                     )} />
                  </span>
               </button>

               <button 
                  onClick={startStudy}
                  disabled={selectedRows.size === 0}
                  className="flex items-center gap-2 px-8 py-4 rounded-xl bg-brand text-white font-bold hover:bg-brand-hover transition-all shadow-sm shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  Start Session
               </button>
            </div>
         </motion.div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Hiragana Selection */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
               <div className="flex items-center justify-between mb-6 border-b border-border-hiyori pb-4">
                  <h2 className="text-2xl font-bold text-ink">Hiragana</h2>
                  <button 
                     onClick={() => toggleAll('hiragana')}
                     className="text-brand font-bold text-sm bg-brand/10 px-4 py-2 rounded-lg hover:bg-brand/20 transition-colors"
                  >
                     {hiraganaRows.every(r => selectedRows.has(r.id)) ? 'Deselect All' : 'Select All'}
                  </button>
               </div>
      
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {hiraganaRows.map((row) => (
                     <button
                        key={row.id}
                        onClick={() => toggleRow(row.id)}
                        className={cn(
                           "flex flex-col items-center p-4 rounded-2xl border-2 transition-all group",
                           selectedRows.has(row.id) 
                           ? "border-brand bg-brand/5 shadow-sm" 
                           : "border-border-hiyori bg-surface hover:border-brand/30 hover:bg-page"
                        )}
                     >
                        <div className="flex gap-1 mb-2">
                           {row.chars.map(c => (
                              <span key={c.k} className="text-lg font-bold text-ink group-hover:text-brand">{c.k}</span>
                           ))}
                        </div>
                        <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">{row.label}</span>
                     </button>
                  ))}
               </div>
            </motion.div>
      
            {/* Katakana Selection */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
               <div className="flex items-center justify-between mb-6 border-b border-border-hiyori pb-4">
                  <h2 className="text-2xl font-bold text-ink">Katakana</h2>
                  <button 
                     onClick={() => toggleAll('katakana')}
                     className="text-brand font-bold text-sm bg-brand/10 px-4 py-2 rounded-lg hover:bg-brand/20 transition-colors"
                  >
                     {katakanaRows.every(r => selectedRows.has(r.id)) ? 'Deselect All' : 'Select All'}
                  </button>
               </div>
      
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {katakanaRows.map((row) => (
                     <button
                        key={row.id}
                        onClick={() => toggleRow(row.id)}
                        className={cn(
                           "flex flex-col items-center p-4 rounded-2xl border-2 transition-all group",
                           selectedRows.has(row.id) 
                           ? "border-brand bg-brand/5 shadow-sm" 
                           : "border-border-hiyori bg-surface hover:border-brand/30 hover:bg-page"
                        )}
                     >
                        <div className="flex gap-1 mb-2">
                           {row.chars.map(c => (
                              <span key={c.k} className="text-lg font-bold text-ink group-hover:text-brand">{c.k}</span>
                           ))}
                        </div>
                        <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">{row.label}</span>
                     </button>
                  ))}
               </div>
            </motion.div>
         </div>
      
         <style>{`
            @keyframes shake {
               0%, 100% { transform: translateX(0); }
               25% { transform: translateX(-5px); }
               50% { transform: translateX(5px); }
               75% { transform: translateX(-5px); }
            }
            .shake { animation: shake 0.2s ease-in-out 0s 2; }
         `}</style>
      </div>
   );
}
