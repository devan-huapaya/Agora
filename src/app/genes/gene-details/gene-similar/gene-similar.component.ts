import { Component, OnInit, Input, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GeneNetwork, LinksListResponse, GeneResponse, GeneInfosResponse } from '../../../models';

import {
    ApiService,
    DataService,
    GeneService,
    ForceService
} from '../../../core/services';
import { SortEvent } from 'primeng/primeng';

@Component({
    selector: 'gene-similar',
    templateUrl: './gene-similar.component.html',
    styleUrls: ['./gene-similar.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class GeneSimilarComponent implements OnInit {
    @Input() id: string;
    dataLoaded: boolean = false;
    displayBRDia: boolean = false;
    networkData: GeneNetwork;
    selectedGeneData: GeneNetwork = {
        nodes: [],
        links: [],
        origin: undefined,
        filterLvl: 0
    };

    private gene = this.geneService.getCurrentGene();
    private geneInfo: any;
    private cols: any[];
    private datasource: GeneInfosResponse;
    private genesInfo: any;
    private totalRecords: any;
    private loading: boolean;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private apiService: ApiService,
        private dataService: DataService,
        private geneService: GeneService,
        private forceService: ForceService
    ) { }

    ngOnInit() {
        this.cols = [
            { field: 'hgnc_symbol', header: 'Gene name' },
            { field: 'nominations', header: 'Nominated Target' },
            { field: 'haseqtl', header: 'Brain Eqtl' },
            { field: 'isIGAP', header: 'AD Genetic Association'},
            { field: 'druggability', subfield: 'pharos_class', header: 'Druggability Bucket'},
            { field: 'druggability', header: 'Pharos Class'}
        ];
        // The data wasn't loaded yet, redirect for now
        if (!this.geneInfo) { this.geneInfo = this.geneService.getCurrentInfo(); }
        if (!this.id) { this.id = this.route.snapshot.paramMap.get('id'); }
        // if (!!this.forceService.getGeneClickedList() &&
        //     this.forceService.getGeneClickedList().origin.ensembl_gene_id === this.id) {
        //     this.selectedGeneData = this.forceService.getGeneClickedList();
        //     this.dataLoaded = true;
        // } else if (!!this.forceService.getGeneOriginalList() &&
        //     this.forceService.getGeneOriginalList().origin.ensembl_gene_id === this.id) {
        //     this.selectedGeneData = this.forceService.getGeneOriginalList();
        //     this.dataLoaded = true;
        // } else {
        this.apiService.getGene(this.id).subscribe((data) => {
            if (!data['item']) { this.router.navigate(['/genes']); }
            this.geneService.setCurrentGene(data['item']);
            this.geneService.setCurrentInfo(data['geneInfo']);
            this.gene = data['item'];
            this.geneInfo = data['geneInfo'];
            this.apiService.getLinksList(this.gene).subscribe(
                (linksList: LinksListResponse) => {
                this.dataService.loadNodes(linksList, this.gene).then((datalinks: any) => {
                    this.forceService.processNodes(this.gene).then((dn: GeneNetwork) => {
                        const nodesIds = dn.nodes.map((gene) => gene.ensembl_gene_id );
                        this.apiService.getInfosMatchIds(nodesIds).subscribe((datas) => {
                            // this.datasource =(datas['items']) ?
                            // datas['items'] as GeneInfosResponse : [];
                            this.genesInfo = datas['items'];
                            this.totalRecords = datas['items'].length;
                            this.loading = false;
                        });
                    });
                });
            });
        });
        // }
    }

    viewGene(id: string) {
        this.apiService.getGene(id).subscribe((data: GeneResponse) => {
            this.router.routeReuseStrategy.shouldReuseRoute = () => false;
            const currentUrl = this.router.url + '?';
            if (!data.item) {
                this.router.navigate(['/genes']);
                return;
            }
            this.geneService.updateGeneData(data);
            this.router.navigateByUrl(currentUrl)
                .then(() => {
                    this.router.navigated = false;
                    this.router.navigate(['/genes',
                        {
                            outlets:
                            {
                                'genes-router': ['gene-details', data['item'].ensembl_gene_id]
                            }
                        }]);
                });
        });
    }

    druggabilitypc(druggability): string {
        return druggability.map((dg) => dg['pharos_class']);
    }

    druggability(druggability): string {
        return druggability.map((dg) => `${dg['sm_druggability_bucket']}: ${dg['classification']}`);
    }

    onRowSelect(event) {
        // todo
    }

    onRowUnselect(event) {
        // todo
    }

    customSort(event: SortEvent) {
        event.data.sort((data1, data2) => {
            const value1 = (Array.isArray(data1[event.field])) ?
                data1[event.field].map((nt) => nt.team).join(', ') :
                data1[event.field];
            const value2 = (Array.isArray(data2[event.field])) ?
                data2[event.field].map((nt) => nt.team).join(', ') :
                data2[event.field];
            let result = null;

            if (value1 == null && value2 != null) {
                result = -1;
            } else if (value1 != null && value2 == null) {
                result = 1;
            } else if (value1 == null && value2 == null) {
                result = 0;
            } else if (typeof value1 === 'string' && typeof value2 === 'string') {
                result = value1.localeCompare(value2);
            } else {
                result = (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;
            }

            return (event.order * result);
        });
    }
}
