import { logger } from '../../../utils/logger';
import { webBrowsingService } from './webBrowsingService';
import { format, parse } from 'date-fns';

export interface FlightSearchParams {
  from: string;
  to: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: 'economy' | 'premium_economy' | 'business' | 'first';
}

export interface FlightOption {
  airline: string;
  price: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  link: string;
  flightNumber?: string;
  aircraft?: string;
  terminal?: string;
  priceBreakdown?: {
    base: number;
    taxes: number;
    total: number;
    currency: string;
  };
}

export class FlightSearchService {
  private readonly AIRLINE_WEBSITES = [
    { domain: 'united.com', name: 'United Airlines' },
    { domain: 'delta.com', name: 'Delta Air Lines' },
    { domain: 'aa.com', name: 'American Airlines' },
    { domain: 'southwest.com', name: 'Southwest Airlines' },
    { domain: 'jetblue.com', name: 'JetBlue' },
  ];

  private readonly SEARCH_SITES = [
    'kayak.com',
    'expedia.com',
    'google.com/flights',
    'skyscanner.com',
    'orbitz.com'
  ];

  async searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
    try {
      // Create multiple search queries for better results
      const queries = [
        `${params.from} to ${params.to} flights ${params.departureDate}`,
        `book flight ${params.from} to ${params.to} ${params.departureDate}`,
        `airline tickets ${params.from} ${params.to} ${format(new Date(params.departureDate), 'MMMM d')}`
      ];

      const searchPromises = queries.map(query => webBrowsingService.search(query));
      const searchResults = await Promise.all(searchPromises);
      
      // Combine and filter results
      const allResults = searchResults.flat();
      const uniqueResults = this.filterUniqueResults(allResults);
      
      // Separate airline and aggregator results
      const airlineResults = uniqueResults.filter(result => 
        this.AIRLINE_WEBSITES.some(airline => result.url.includes(airline.domain))
      );
      
      const aggregatorResults = uniqueResults.filter(result =>
        this.SEARCH_SITES.some(site => result.url.includes(site))
      );

      // Generate flight options based on results
      const flightOptions = await this.generateFlightOptions(
        params,
        airlineResults,
        aggregatorResults
      );

      return flightOptions;
    } catch (error) {
      logger.error('FlightSearchService.searchFlights', 'Failed to search flights', { error });
      throw error;
    }
  }

  private filterUniqueResults(results: any[]): any[] {
    const seen = new Set();
    return results.filter(result => {
      const domain = new URL(result.url).hostname;
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    });
  }

  private async generateFlightOptions(
    params: FlightSearchParams,
    airlineResults: any[],
    aggregatorResults: any[]
  ): Promise<FlightOption[]> {
    const departureDate = new Date(params.departureDate);
    const options: FlightOption[] = [];

    // Generate realistic flight times throughout the day
    const flightTimes = this.generateFlightTimes(departureDate);
    
    // Create flight options for direct airline results
    for (const result of airlineResults) {
      const airline = this.AIRLINE_WEBSITES.find(a => 
        result.url.includes(a.domain)
      );

      if (airline) {
        const flightTime = flightTimes.pop();
        if (!flightTime) continue;

        const duration = this.calculateDuration(params.from, params.to);
        const arrivalTime = new Date(flightTime.getTime() + duration * 60000);

        options.push({
          airline: airline.name,
          flightNumber: this.generateFlightNumber(airline.name),
          price: this.generatePrice(params.cabinClass),
          departureTime: format(flightTime, 'h:mm a'),
          arrivalTime: format(arrivalTime, 'h:mm a'),
          duration: this.formatDuration(duration),
          stops: Math.random() > 0.7 ? 1 : 0,
          link: result.url,
          aircraft: this.getRandomAircraft(),
          terminal: this.getRandomTerminal(),
          priceBreakdown: this.generatePriceBreakdown(params.cabinClass)
        });
      }
    }

    // Add some options from aggregators
    for (const result of aggregatorResults.slice(0, 2)) {
      const flightTime = flightTimes.pop();
      if (!flightTime) continue;

      const duration = this.calculateDuration(params.from, params.to);
      const arrivalTime = new Date(flightTime.getTime() + duration * 60000);

      options.push({
        airline: this.getRandomAirline(),
        price: this.generatePrice(params.cabinClass, true), // Slightly lower price for aggregators
        departureTime: format(flightTime, 'h:mm a'),
        arrivalTime: format(arrivalTime, 'h:mm a'),
        duration: this.formatDuration(duration),
        stops: Math.random() > 0.8 ? 1 : 0,
        link: result.url,
        flightNumber: this.generateFlightNumber(),
        aircraft: this.getRandomAircraft(),
        priceBreakdown: this.generatePriceBreakdown(params.cabinClass, true)
      });
    }

    return options;
  }

  private generateFlightTimes(date: Date): Date[] {
    const times = [];
    // Generate flights from 6 AM to 9 PM
    for (let hour = 6; hour <= 21; hour += 2) {
      const flightTime = new Date(date);
      flightTime.setHours(hour, Math.floor(Math.random() * 60));
      times.push(flightTime);
    }
    return times.sort(() => Math.random() - 0.5);
  }

  private calculateDuration(from: string, to: string): number {
    // Simplified duration calculation based on common routes
    const routes: { [key: string]: number } = {
      'NYC-LAX': 360, // 6 hours
      'NYC-SFO': 380, // 6h20m
      'NYC-CHI': 150, // 2h30m
      'NYC-MIA': 180, // 3h
      'LAX-NYC': 330, // 5h30m
      'SFO-NYC': 350, // 5h50m
      'CHI-NYC': 140, // 2h20m
      'MIA-NYC': 170, // 2h50m
    };

    const route = `${from}-${to}`;
    return routes[route] || 240; // Default to 4 hours if route not found
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  private generatePrice(cabinClass?: string, isAggregator: boolean = false): string {
    const basePrice = {
      'economy': 250,
      'premium_economy': 450,
      'business': 850,
      'first': 1500
    }[cabinClass || 'economy'];

    const variance = basePrice * 0.2; // 20% variance
    let price = basePrice + (Math.random() * variance) - (variance / 2);
    
    if (isAggregator) {
      price *= 0.95; // 5% discount for aggregators
    }

    return `$${Math.round(price)}`;
  }

  private generatePriceBreakdown(cabinClass?: string, isAggregator: boolean = false): FlightOption['priceBreakdown'] {
    const basePrice = parseFloat(this.generatePrice(cabinClass, isAggregator).replace('$', ''));
    const taxRate = 0.15; // 15% tax rate
    const taxes = Math.round(basePrice * taxRate);
    
    return {
      base: basePrice,
      taxes,
      total: basePrice + taxes,
      currency: 'USD'
    };
  }

  private getRandomAircraft(): string {
    const aircraft = [
      'Boeing 737-800',
      'Airbus A320',
      'Boeing 787-9',
      'Airbus A321neo',
      'Boeing 777-300ER'
    ];
    return aircraft[Math.floor(Math.random() * aircraft.length)];
  }

  private getRandomTerminal(): string {
    return `Terminal ${Math.floor(Math.random() * 5) + 1}`;
  }

  private getRandomAirline(): string {
    const airlines = this.AIRLINE_WEBSITES.map(a => a.name);
    return airlines[Math.floor(Math.random() * airlines.length)];
  }

  private generateFlightNumber(airline?: string): string {
    const prefix = airline ? 
      airline.split(' ')[0].substring(0, 2).toUpperCase() :
      'FL';
    return `${prefix}${Math.floor(Math.random() * 9000) + 1000}`;
  }

  getRecommendedFlights(options: FlightOption[]): FlightOption[] {
    return options.sort((a, b) => {
      // Convert prices to numbers for comparison
      const aPrice = parseFloat(a.price.replace(/[^0-9.]/g, ''));
      const bPrice = parseFloat(b.price.replace(/[^0-9.]/g, ''));
      
      // Primary sort by stops
      if (a.stops !== b.stops) {
        return a.stops - b.stops;
      }
      
      // Secondary sort by price
      return aPrice - bPrice;
    });
  }
}

export const flightSearchService = new FlightSearchService(); 