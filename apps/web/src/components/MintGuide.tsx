"use client";
import { useState } from "react";

export function MintGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📖</span>
          <div>
            <p className="font-bold text-blue-900">Інструкція для студентів</p>
            <p className="text-sm text-blue-600">Як завантажити зображення та створити NFT</p>
          </div>
        </div>
        <span className="text-blue-500 text-xl font-bold">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-6 border-t border-blue-100 pt-5">

          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0 text-sm">1</div>
            <div>
              <p className="font-bold text-gray-900 mb-2">Отримайте тестовий ETH (Sepolia)</p>
              <p className="text-sm text-gray-600 mb-2">Для мінтингу потрібен невеликий обсяг тестового ETH для оплати газу.</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Відкрийте MetaMask та переключіться на мережу <strong>Sepolia Testnet</strong></li>
                <li>Скопіюйте адресу вашого гаманця</li>
                <li>Перейдіть на <a href="https://sepoliafaucet.com" target="_blank" className="text-blue-500 underline font-medium">sepoliafaucet.com</a> або <a href="https://faucet.quicknode.com/ethereum/sepolia" target="_blank" className="text-blue-500 underline font-medium">faucet.quicknode.com</a></li>
                <li>Вставте адресу та отримайте тестовий ETH (0.1-0.5 ETH)</li>
              </ol>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0 text-sm">2</div>
            <div>
              <p className="font-bold text-gray-900 mb-2">Завантажте зображення на Pinata (IPFS)</p>
              <p className="text-sm text-gray-600 mb-2">Ваше зображення NFT потрібно розмістити в інтернеті. Рекомендуємо Pinata — безкоштовний IPFS хостинг.</p>
              <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
                <li>Зареєструйтесь на <a href="https://pinata.cloud" target="_blank" className="text-blue-500 underline font-medium">pinata.cloud</a> (безкоштовно)</li>
                <li>Натисніть <strong>"Upload"</strong> → <strong>"File"</strong></li>
                <li>Оберіть зображення з вашого комп'ютера (JPG, PNG, GIF, SVG)</li>
                <li>Після завантаження натисніть на файл → скопіюйте <strong>CID</strong> (виглядає як <code className="bg-blue-100 px-1 rounded text-xs">bafkrei...</code>)</li>
                <li>Сформуйте URL: <code className="bg-blue-100 px-1 rounded text-xs">https://gateway.pinata.cloud/ipfs/ВАШ_CID</code></li>
              </ol>
              <div className="mt-3 bg-white rounded-xl p-3 border border-blue-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Приклад URL:</p>
                <code className="text-xs text-blue-700 break-all">https://gateway.pinata.cloud/ipfs/bafkreiht5mhinyjglyzbroi7scxw2abzcbifqiewhy7tpusrz2655k43ty</code>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0 text-sm">3</div>
            <div>
              <p className="font-bold text-gray-900 mb-2">Заповніть форму мінтингу</p>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li><strong>Name</strong> — назва вашого NFT (наприклад: "Мій перший NFT")</li>
                <li><strong>Description</strong> — короткий опис роботи</li>
                <li><strong>Image URL</strong> — вставте URL з Pinata (крок 2)</li>
                <li><strong>Attributes</strong> — необов'язково: додайте характеристики (наприклад: Автор / Іваненко І.І.)</li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0 text-sm">4</div>
            <div>
              <p className="font-bold text-gray-900 mb-2">Підтвердіть транзакцію в MetaMask</p>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li>Натисніть кнопку <strong>"Mint NFT"</strong></li>
                <li>MetaMask відкриє вікно підтвердження — натисніть <strong>"Confirm"</strong></li>
                <li>Зачекайте 15-60 секунд поки транзакція підтвердиться</li>
                <li>Після успіху перейдіть до <strong>"My NFTs"</strong> щоб побачити свій токен</li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0 text-sm">5</div>
            <div>
              <p className="font-bold text-gray-900 mb-2">Виставте NFT на продаж</p>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li>Перейдіть до <strong>"My NFTs"</strong> → натисніть на картку NFT</li>
                <li>Натисніть <strong>"Approve Marketplace"</strong> → підтвердьте в MetaMask</li>
                <li>Введіть ціну в ETH → натисніть <strong>"List"</strong></li>
                <li>Ваш NFT з'явиться на маркетплейсі для всіх студентів</li>
              </ul>
            </div>
          </div>

          {/* Warning */}
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            <strong>Важливо:</strong> Використовуйте публічний URL зображення. Pinata безкоштовно надає 1 GB сховища. Не використовуйте локальні файли з вашого комп'ютера — вони не будуть доступні іншим.
          </div>

        </div>
      )}
    </div>
  );
}
