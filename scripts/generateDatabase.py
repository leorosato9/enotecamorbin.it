import os
import time
import json
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    ElementClickInterceptedException
)

class TannicoSeleniumScraper:
    def __init__(self, start_url, output_file="tannico_wines.json"):
        self.start_url = start_url
        self.output_file = output_file
        if os.path.isfile(self.output_file):
            try:
                with open(self.output_file, "r", encoding="utf-8") as f:
                    self.wines_data = json.load(f)
                print(f"Caricati {len(self.wines_data)} bottiglie già salvate da '{self.output_file}'.")
            except Exception as e:
                print(f"Errore caricando '{self.output_file}': {e}. Parto con lista vuota.")
                self.wines_data = []
        else:
            self.wines_data = []

        service = ChromeService(executable_path=ChromeDriverManager().install())
        options = webdriver.ChromeOptions()
        # options.add_argument("--headless")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")

        self.driver = webdriver.Chrome(service=service, options=options)
        self.wait = WebDriverWait(self.driver, 10)


    def load_all_wine_links(self):
        # 1) Apro la pagina che elenca tutti i vini
        self.driver.get(self.start_url)
        time.sleep(2)  # attesa per caricamento iniziale

        # 2) Ripeto il click su “Mostra di più” finché possibile
        while True:
            try:
                # Ora "Mostra di più" è un <button>
                mostra_di_piu = self.wait.until(
                    EC.presence_of_element_located(
                        (By.XPATH, "/html/body/main/div[2]/div[2]/div/div[3]/div[2]/button")
                    )
                )

                # Scorro al centro dello schermo e clicco
                self.driver.execute_script(
                    "arguments[0].scrollIntoView({block: 'center'});", mostra_di_piu
                )
                time.sleep(1)
                self.driver.execute_script("arguments[0].click();", mostra_di_piu)
                time.sleep(2)  # attendo il caricamento delle nuove card

                # Verifico se supero soglia di 3002 bottiglie
                try:
                    bottiglie_elem = self.driver.find_element(
                        By.XPATH, "/html/body/div[1]/div[2]/main/div[2]/div[5]/p[1]/strong"
                    )
                    count = int(re.sub(r"\D", "", bottiglie_elem.text))
                    if count > 3002:
                        break
                except NoSuchElementException:
                    pass

            except (TimeoutException, NoSuchElementException):
                # Nessun altro bottone: ho caricato tutto
                break
            except ElementClickInterceptedException:
                # Riprovo lo scroll e click
                try:
                    self.driver.execute_script("window.scrollBy(0, -100);")
                    time.sleep(1)
                    self.driver.execute_script("arguments[0].click();", mostra_di_piu)
                    time.sleep(2)
                except:
                    break
            except Exception:
                break

        # 3) Scroll finale per lazy load
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        for _ in range(5):
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1)
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

        # 4) Raccolta link dettagli vino
        links = []
        elems = self.driver.find_elements(By.CSS_SELECTOR, "a[href^='/products/']")
        for e in elems:
            href = e.get_attribute("href")
            if href and "/products/" in href and href not in links:
                links.append(href)

        return links

    def scrape(self):
        # Carico la lista di link (con eventuale filtraggio “Mostra di più” fino alla soglia)
        wine_links = self.load_all_wine_links()

        # Preparo un dizionario di supporto per controllare velocemente esistenza tramite URL
        existing_index = {wine["url"]: idx for idx, wine in enumerate(self.wines_data)}

        # Contatori delle bottiglie aggiunte/aggiornate
        added_count = 0
        updated_count = 0

        # Funzione ausiliaria per pulire un testo rimuovendo la parola chiave iniziale
        def clean_field(text, keyword):
            if not text:
                return None
            pattern = rf"(?i)^{keyword}\s*[:\-]?\s*"
            return re.sub(pattern, "", text).strip()

        # Inizio a iterare su ciascun URL di vino
        for index, url in enumerate(wine_links, start=1):
            print(f"\n[{index}/{len(wine_links)}] Elaborazione bottiglia: {url}")

            self.driver.get(url)
            time.sleep(2)  # attendo che il dettaglio si carichi

            # Costruisco il dizionario con tutti i campi di quella bottiglia
            wine_info = {}

            def get_text(xpath):
                try:
                    return self.driver.find_element(By.XPATH, xpath).text.strip()
                except NoSuchElementException:
                    return None
                except:
                    return None

            wine_info["url"] = url
            wine_info["nome_completo"] = get_text("/html/body/div[1]/div[2]/main/div/h1")
            wine_info["prezzo"] = get_text("/html/body/div[1]/div[2]/main/div/p/span[1]")

            raw_annata = get_text("/html/body/div[1]/div[2]/main/div/ul[2]/li[1]/p")
            wine_info["annata"] = clean_field(raw_annata, "Annata")

            raw_denominazione = get_text("/html/body/div[1]/div[2]/main/div/ul[2]/li[2]/p")
            wine_info["denominazione"] = clean_field(raw_denominazione, "Denominazione")

            raw_vitigni = get_text("/html/body/div[1]/div[2]/main/div/ul[2]/li[3]/p")
            wine_info["vitigni"] = clean_field(raw_vitigni, "Vitigni")

            raw_alcol = get_text("/html/body/div[1]/div[2]/main/div/ul[2]/li[4]/p")
            wine_info["alcol"] = clean_field(raw_alcol, "Alcol")

            raw_tipologia = get_text("/html/body/div[1]/div[2]/main/div/ul[2]/li[11]/p")
            wine_info["categoria"] = clean_field(raw_tipologia, "Tipologia")

            raw_abbinamenti_1 = get_text("/html/body/div[1]/div[2]/main/div/ul[2]/li[12]/p")
            wine_info["abbinamenti_1"] = clean_field(raw_abbinamenti_1, "Abbinamenti")

            wine_info["note_degustazione"] = get_text("/html/body/div[1]/div[2]/section/div/div[1]/div[1]/p")

            raw_abbinamenti_2 = get_text("/html/body/div[1]/div[2]/section/div/div[1]/div[2]/p")
            wine_info["abbinamenti_2"] = clean_field(raw_abbinamenti_2, "Abbinamenti")

            wine_info["perche_piace"] = get_text("/html/body/div[1]/div[2]/section/div/div[2]/div/p")

            # Verifico se l'URL è già presente nei dati caricati in memoria
            if url in existing_index:
                # La bottiglia esiste già: confronto campo per campo
                idx = existing_index[url]
                existing_record = self.wines_data[idx]
                # Controllo se almeno un campo è diverso
                changed = False
                for key, val in wine_info.items():
                    # Se esiste nel record precedente e differisce, segnalo “changed”
                    old_val = existing_record.get(key)
                    if val != old_val:
                        changed = True
                        break

                if changed:
                    # Aggiorno l'intero dizionario per semplicità
                    self.wines_data[idx] = wine_info
                    updated_count += 1
                    print(f"Aggiornata bottiglia: {url}")
                else:
                    print(f"Esiste già, nessuna modifica: {url}")

            else:
                # Non è presente: la aggiungo in coda
                self.wines_data.append(wine_info)
                # Aggiorno anche il dizionario di supporto per includere il nuovo indice
                existing_index[url] = len(self.wines_data) - 1
                added_count += 1
                print(f"Aggiunta nuova bottiglia: {url}")

            # Salvo su file dopo ogni singola elaborazione (sia nuova che aggiornamento)
            try:
                with open(self.output_file, "w", encoding="utf-8") as f:
                    json.dump(self.wines_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Errore scrivendo su '{self.output_file}': {e}")

        # Alla fine del ciclo, stampo riepilogo
        print("\n=== RIEPILOGO FINALE ===")
        print(f"Bottiglie aggiunte: {added_count}")
        print(f"Bottiglie aggiornate: {updated_count}")

    def close(self):
        self.driver.quit()

if __name__ == "__main__":
    start_url = "https://www.tannico.it/altri/rose.html"
    scraper = TannicoSeleniumScraper(
        start_url,
        output_file="vini.json"
    )
    scraper.scrape()
    scraper.close()
    print("\nScraping completato. Dati salvati in vini.json.")
